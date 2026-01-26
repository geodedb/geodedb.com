---
title: "Design Patterns"
description: "Common software design patterns, architectural approaches, and best practices in Geode development"
keywords: ["design patterns", "software patterns", "architectural patterns", "Gang of Four", "design principles", "SOLID", "creational patterns", "structural patterns", "behavioral patterns"]
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Design Patterns

Design patterns are reusable solutions to commonly occurring problems in software design. Geode leverages proven design patterns to create maintainable, scalable, and testable code across its graph database implementation.

## Creational Patterns

### Factory Pattern

Geode uses factories to create complex objects with consistent initialization:

```zig
pub const NodeFactory = struct {
    allocator: Allocator,
    
    pub fn createNode(self: *Self, labels: []const []const u8, props: Properties) !*Node {
        const node = try self.allocator.create(Node);
        errdefer self.allocator.destroy(node);
        
        node.* = Node{
            .id = try generateId(),
            .labels = try self.allocator.dupe([]const u8, labels),
            .properties = try props.clone(self.allocator),
        };
        
        return node;
    }
};
```

This pattern centralizes object creation logic and ensures proper initialization.

### Builder Pattern

Complex query construction uses the builder pattern:

```gql
-- Fluent query builder pattern in GQL
MATCH (p:Person)
WHERE p.age > 18
WITH p, p.followers AS followers
WHERE SIZE(followers) > 1000
RETURN p.name, SIZE(followers) AS follower_count
ORDER BY follower_count DESC
LIMIT 10;
```

Builders enable step-by-step construction of complex objects.

### Singleton Pattern

Geode uses singletons for global system resources:

```zig
pub const ConfigManager = struct {
    var instance: ?*ConfigManager = null;
    var mutex: std.Thread.Mutex = .{};
    
    pub fn getInstance(allocator: Allocator) !*ConfigManager {
        mutex.lock();
        defer mutex.unlock();
        
        if (instance == null) {
            instance = try allocator.create(ConfigManager);
            instance.?.* = try ConfigManager.init(allocator);
        }
        
        return instance.?;
    }
};
```

Singletons ensure a single instance of critical resources.

### Object Pool Pattern

Connection pooling reuses expensive resources:

```zig
pub const ConnectionPool = struct {
    available: std.ArrayList(*Connection),
    in_use: std.ArrayList(*Connection),
    max_size: usize,
    
    pub fn acquire(self: *Self) !*Connection {
        if (self.available.items.len > 0) {
            const conn = self.available.pop();
            try self.in_use.append(conn);
            return conn;
        }
        
        if (self.getTotalSize() < self.max_size) {
            const conn = try self.createConnection();
            try self.in_use.append(conn);
            return conn;
        }
        
        return error.PoolExhausted;
    }
};
```

Pooling reduces allocation overhead for frequently used objects.

## Structural Patterns

### Adapter Pattern

Geode adapts different storage backends to a common interface:

```zig
pub const StorageAdapter = struct {
    pub const Interface = struct {
        ptr: *anyopaque,
        vtable: *const VTable,
        
        pub const VTable = struct {
            read: *const fn(*anyopaque, []const u8) anyerror![]u8,
            write: *const fn(*anyopaque, []const u8, []const u8) anyerror!void,
            delete: *const fn(*anyopaque, []const u8) anyerror!void,
        };
        
        pub fn read(self: Interface, key: []const u8) ![]u8 {
            return self.vtable.read(self.ptr, key);
        }
    };
};
```

Adapters enable interchangeable implementations.

### Decorator Pattern

Query execution is enhanced through decorators:

```zig
pub const QueryExecutor = struct {
    base: *const Executor,
    
    pub const CachingDecorator = struct {
        executor: QueryExecutor,
        cache: *QueryCache,
        
        pub fn execute(self: *Self, query: Query) !Result {
            if (self.cache.get(query.hash())) |cached| {
                return cached;
            }
            
            const result = try self.executor.base.execute(query);
            try self.cache.put(query.hash(), result);
            return result;
        }
    };
};
```

Decorators add behavior without modifying existing code.

### Facade Pattern

Complex subsystems are simplified through facades:

```zig
pub const GraphDatabaseFacade = struct {
    storage: *StorageEngine,
    query_engine: *QueryEngine,
    tx_manager: *TransactionManager,
    
    pub fn executeQuery(self: *Self, gql: []const u8) !ResultSet {
        const tx = try self.tx_manager.begin();
        errdefer tx.rollback() catch {};
        
        const ast = try self.query_engine.parse(gql);
        const plan = try self.query_engine.optimize(ast);
        const result = try self.query_engine.execute(plan, self.storage);
        
        try tx.commit();
        return result;
    }
};
```

Facades provide a simplified interface to complex systems.

### Proxy Pattern

Remote access and caching use proxy patterns:

```zig
pub const RemoteGraphProxy = struct {
    client: *QuicClient,
    local_cache: *Cache,
    
    pub fn getNode(self: *Self, id: NodeId) !Node {
        // Check local cache first
        if (self.local_cache.get(id)) |node| {
            return node;
        }
        
        // Fetch from remote server
        const node = try self.client.fetchNode(id);
        try self.local_cache.put(id, node);
        return node;
    }
};
```

Proxies control access and add functionality transparently.

### Composite Pattern

Graph structures use the composite pattern:

```zig
pub const GraphElement = union(enum) {
    node: Node,
    edge: Edge,
    subgraph: Subgraph,
    
    pub fn properties(self: GraphElement) Properties {
        return switch (self) {
            .node => |n| n.properties,
            .edge => |e| e.properties,
            .subgraph => |s| s.aggregateProperties(),
        };
    }
};
```

Composites treat individual objects and compositions uniformly.

## Behavioral Patterns

### Strategy Pattern

Query optimization uses pluggable strategies:

```zig
pub const OptimizationStrategy = union(enum) {
    rule_based: RuleBasedOptimizer,
    cost_based: CostBasedOptimizer,
    heuristic: HeuristicOptimizer,
    
    pub fn optimize(self: OptimizationStrategy, plan: QueryPlan) !QueryPlan {
        return switch (self) {
            .rule_based => |opt| opt.optimize(plan),
            .cost_based => |opt| opt.optimize(plan),
            .heuristic => |opt| opt.optimize(plan),
        };
    }
};
```

Strategies enable runtime algorithm selection.

### Observer Pattern

Change notifications use the observer pattern:

```zig
pub const ChangeNotifier = struct {
    observers: std.ArrayList(*Observer),
    
    pub fn attach(self: *Self, observer: *Observer) !void {
        try self.observers.append(observer);
    }
    
    pub fn notify(self: *Self, event: ChangeEvent) !void {
        for (self.observers.items) |observer| {
            try observer.update(event);
        }
    }
};
```

Observers decouple event sources from event handlers.

### Iterator Pattern

Result sets provide consistent iteration:

```zig
pub const ResultIterator = struct {
    result_set: *ResultSet,
    position: usize,
    
    pub fn next(self: *Self) ?Row {
        if (self.position >= self.result_set.rows.len) {
            return null;
        }
        
        defer self.position += 1;
        return self.result_set.rows[self.position];
    }
};
```

Iterators provide sequential access without exposing internal structure.

### Command Pattern

Transactions use the command pattern:

```zig
pub const Command = union(enum) {
    insert_node: InsertNodeCommand,
    update_node: UpdateNodeCommand,
    delete_node: DeleteNodeCommand,
    
    pub fn execute(self: Command, storage: *Storage) !void {
        switch (self) {
            .insert_node => |cmd| try storage.insertNode(cmd.node),
            .update_node => |cmd| try storage.updateNode(cmd.id, cmd.properties),
            .delete_node => |cmd| try storage.deleteNode(cmd.id),
        }
    }
    
    pub fn undo(self: Command, storage: *Storage) !void {
        switch (self) {
            .insert_node => |cmd| try storage.deleteNode(cmd.node.id),
            .update_node => |cmd| try storage.updateNode(cmd.id, cmd.old_properties),
            .delete_node => |cmd| try storage.insertNode(cmd.deleted_node),
        }
    }
};
```

Commands encapsulate operations for execution, undo, and replay.

### Template Method Pattern

Query execution follows a template:

```zig
pub const QueryExecutionTemplate = struct {
    pub fn execute(self: *Self, query: Query) !Result {
        try self.validate(query);
        const plan = try self.plan(query);
        const optimized = try self.optimize(plan);
        const result = try self.executePhysical(optimized);
        try self.postProcess(result);
        return result;
    }
    
    // Subclasses override specific steps
    fn validate(self: *Self, query: Query) !void;
    fn plan(self: *Self, query: Query) !QueryPlan;
    fn optimize(self: *Self, plan: QueryPlan) !QueryPlan;
};
```

Templates define algorithm structure with customizable steps.

### Chain of Responsibility Pattern

Request processing uses handler chains:

```zig
pub const RequestHandler = struct {
    next: ?*RequestHandler,
    
    pub fn handle(self: *Self, request: Request) !Response {
        if (self.canHandle(request)) {
            return self.process(request);
        }
        
        if (self.next) |next_handler| {
            return next_handler.handle(request);
        }
        
        return error.NoHandlerFound;
    }
    
    fn canHandle(self: *Self, request: Request) bool;
    fn process(self: *Self, request: Request) !Response;
};
```

Chains enable flexible request routing and processing.

### State Pattern

Connection lifecycle management uses state machines:

```zig
pub const ConnectionState = union(enum) {
    disconnected: Disconnected,
    connecting: Connecting,
    connected: Connected,
    closing: Closing,
    
    pub fn handleEvent(self: *ConnectionState, event: Event) !void {
        switch (self.*) {
            .disconnected => |*state| self.* = try state.connect(),
            .connecting => |*state| self.* = try state.onConnected(),
            .connected => |*state| self.* = try state.onClose(),
            .closing => |*state| self.* = try state.onClosed(),
        }
    }
};
```

State patterns make state transitions explicit and manageable.

## SOLID Principles

### Single Responsibility Principle

Each component has one reason to change:

```zig
// Good - Single responsibility
pub const UserValidator = struct {
    pub fn validate(user: User) !void { }
};

pub const UserRepository = struct {
    pub fn save(user: User) !void { }
};

pub const UserNotifier = struct {
    pub fn sendWelcomeEmail(user: User) !void { }
};
```

### Open-Closed Principle

Open for extension, closed for modification:

```zig
// Good - Extensible through interfaces
pub const Serializer = struct {
    pub const Interface = struct {
        serialize: *const fn(*anyopaque, *Node) anyerror![]u8,
    };
};

// Add new serializers without modifying existing code
pub const JsonSerializer = struct { /* implementation */ };
pub const BinarySerializer = struct { /* implementation */ };
```

### Liskov Substitution Principle

Subtypes must be substitutable for their base types:

```zig
// All storage implementations must satisfy the contract
pub const Storage = struct {
    pub const Interface = struct {
        // Contract: read returns data or error
        read: *const fn(*anyopaque, []const u8) anyerror![]u8,
        // Contract: write persists data or returns error
        write: *const fn(*anyopaque, []const u8, []const u8) anyerror!void,
    };
};
```

### Interface Segregation Principle

Clients shouldn't depend on unused interfaces:

```zig
// Good - Split into specific interfaces
pub const Readable = struct {
    read: *const fn(*anyopaque, []const u8) anyerror![]u8,
};

pub const Writable = struct {
    write: *const fn(*anyopaque, []const u8, []const u8) anyerror!void,
};

// Clients only depend on what they need
pub const LogReader = struct {
    storage: Readable,  // Only needs read capability
};
```

### Dependency Inversion Principle

Depend on abstractions, not concretions:

```zig
// Good - Depends on interface
pub const QueryEngine = struct {
    storage: StorageInterface,  // Abstract interface
    
    pub fn execute(self: *Self, query: Query) !Result {
        return self.storage.fetch(query.pattern);
    }
};
```

## Best Practices

### Pattern Selection

Choose patterns based on actual needs:

- Use patterns to solve real problems, not for their own sake
- Start simple, refactor to patterns when complexity warrants
- Consider team familiarity and maintenance implications

### Pattern Composition

Combine patterns for complex scenarios:

```zig
// Strategy + Factory + Singleton
pub const OptimizerFactory = struct {
    var instance: ?*OptimizerFactory = null;
    
    pub fn getInstance() !*OptimizerFactory { /* ... */ }
    
    pub fn createOptimizer(strategy: OptimizationType) !*Optimizer {
        return switch (strategy) {
            .rule_based => try RuleBasedOptimizer.init(),
            .cost_based => try CostBasedOptimizer.init(),
        };
    }
};
```

### Anti-Patterns to Avoid

Common mistakes to watch for:

**God Object** - Classes that know or do too much
**Spaghetti Code** - Lack of structure and organization
**Golden Hammer** - Using one pattern for everything
**Premature Optimization** - Optimizing before measuring

## Performance Considerations

### Pattern Overhead

Some patterns add indirection:

- Virtual function calls have small overhead
- Extra allocations impact memory usage
- Balance abstraction with performance needs

### Optimization Opportunities

Patterns can enable optimizations:

- Strategy pattern allows runtime algorithm selection
- Proxy pattern enables transparent caching
- Flyweight pattern reduces memory usage

## Testing Patterns

### Test Doubles

Use test patterns for isolation:

```zig
pub const MockStorage = struct {
    expected_calls: std.ArrayList(Call),
    
    pub fn read(self: *Self, key: []const u8) ![]u8 {
        try self.recordCall(.{ .read = key });
        return self.canned_response;
    }
};
```

### Builder Pattern for Tests

Simplify test data creation:

```zig
pub const NodeBuilder = struct {
    node: Node,
    
    pub fn withLabel(self: *Self, label: []const u8) *Self {
        try self.node.labels.append(label);
        return self;
    }
    
    pub fn withProperty(self: *Self, key: []const u8, value: Value) *Self {
        try self.node.properties.put(key, value);
        return self;
    }
    
    pub fn build(self: *Self) Node {
        return self.node;
    }
};
```

## Related Topics

- [Architecture](/tags/architecture) - System architecture patterns
- [Best Practices](/tags/best-practices) - Development best practices
- [Testing](/tags/testing) - Testing strategies and patterns
- [Performance](/tags/performance) - Performance optimization

## Learn More

- [Design Patterns: Elements of Reusable Object-Oriented Software](https://en.wikipedia.org/wiki/Design_Patterns)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Refactoring Guru - Design Patterns](https://refactoring.guru/design-patterns)
