---
title: "Query Execution Architecture"
description: "Deep dive into Geode's query execution pipeline including parser, planner, optimizer, and executor with distributed query coordination"
keywords: ["query execution", "parser", "planner", "optimizer", "executor", "distributed queries", "query pipeline"]
weight: 30
slug: "query-execution"
canonical: "https://geodedb.com/docs/architecture/query-execution"
---

<!-- CANARY: REQ=REQ-ENGINE-005; FEATURE="Engine"; ASPECT=CostBasedOptimizer; STATUS=TESTED; OWNER=engine; UPDATED=2026-01-15 -->

# Query Execution Architecture

This document provides a comprehensive overview of Geode's query execution pipeline, from GQL parsing through distributed execution, covering the parser, planner, optimizer, and executor components.

## Overview

Geode's query execution follows a sophisticated pipeline that transforms user GQL queries into optimized execution plans and distributed operations.

### Execution Pipeline

\`\`\`
┌─────────────┐
│ GQL Query   │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Parser (Lexer)   │ ← Tokenization, syntax validation
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ AST Generation   │ ← Abstract Syntax Tree construction
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Semantic Analysis│ ← Type checking, validation
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Query Planner    │ ← Logical plan generation
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Optimizer        │ ← Cost-based optimization
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Physical Planner │ ← Physical execution plan
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Executor         │ ← Query execution
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Results          │
└──────────────────┘
\`\`\`

## Component 1: Parser and Lexer

### Lexical Analysis (Lexer)

The lexer (`src/gql/lexer.zig`) tokenizes the input GQL query into a stream of tokens.

**Implementation Location**: `src/gql/lexer.zig` (631 LOC)

**Key Responsibilities**:
- Tokenize input string
- Recognize GQL keywords (105+ reserved keywords)
- Handle literals (strings, numbers, booleans, null)
- Process operators and symbols
- Manage whitespace and comments

**Example Tokenization**:
\`\`\`
Input: "MATCH (p:Person {age: 30}) RETURN p.name"

Tokens:
1. MATCH (keyword)
2. ( (left_paren)
3. p (identifier)
4. : (colon)
5. Person (identifier)
6. { (left_brace)
7. age (identifier)
8. : (colon)
9. 30 (integer_literal)
10. } (right_brace)
11. ) (right_paren)
12. RETURN (keyword)
13. p (identifier)
14. . (dot)
15. name (identifier)
\`\`\`

**Performance**:
- **Throughput**: ~1M tokens/second
- **Memory**: O(n) where n is query length
- **Complexity**: O(n) linear scan

### Syntax Analysis (Parser)

The parser (`src/gql/parser.zig`) builds an Abstract Syntax Tree (AST) from the token stream.

**Implementation Location**: `src/gql/parser.zig` (5,883 LOC)

**Key Responsibilities**:
- Construct AST from tokens
- Validate GQL syntax
- Handle operator precedence
- Manage nested expressions
- Error recovery and reporting

**AST Structure**:
\`\`\`zig
pub const Statement = union(enum) {
    Query: QueryStatement,
    Create: CreateStatement,
    Delete: DeleteStatement,
    Set: SetStatement,
    Merge: MergeStatement,
    Explain: ExplainStatement,
    Profile: ProfileStatement,
    // ... other statement types
};

pub const QueryStatement = struct {
    match_clause: ?MatchClause,
    where_clause: ?WhereClause,
    return_clause: ReturnClause,
    order_by: ?OrderBy,
    limit: ?LimitClause,
    offset: ?OffsetClause,
};

pub const MatchClause = struct {
    patterns: []Pattern,
    optional: bool,
};

pub const Pattern = struct {
    nodes: []NodePattern,
    relationships: []RelationshipPattern,
    path_variable: ?[]const u8,
};
\`\`\`

**Parser Techniques**:

1. **Recursive Descent Parsing**:
\`\`\`zig
fn parseStatement(self: *Parser) ParserError!Statement {
    const token = self.peek();
    return switch (token.type) {
        .MATCH, .OPTIONAL => self.parseQueryStatement(),
        .CREATE => self.parseCreateStatement(),
        .DELETE => self.parseDeleteStatement(),
        .MERGE => self.parseMergeStatement(),
        .EXPLAIN => self.parseExplainStatement(),
        .PROFILE => self.parseProfileStatement(),
        else => error.UnexpectedToken,
    };
}
\`\`\`

2. **Operator Precedence Climbing**:
\`\`\`zig
fn parseExpression(self: *Parser, min_precedence: u8) ParserError!Expression {
    var left = try self.parsePrimaryExpression();

    while (true) {
        const op = self.peek();
        const precedence = getOperatorPrecedence(op.type);

        if (precedence < min_precedence) break;

        _ = try self.expect(op.type);
        const right = try self.parseExpression(precedence + 1);

        left = Expression{
            .Binary = BinaryExpression{
                .left = left,
                .operator = op.type,
                .right = right,
            },
        };
    }

    return left;
}
\`\`\`

**Operator Precedence** (highest to lowest):
1. Member access (`.`), function calls
2. Unary operators (`NOT`, `-`)
3. Multiplicative (`*`, `/`, `%`)
4. Additive (`+`, `-`)
5. Comparison (`=`, `<>`, `<`, `>`, `<=`, `>=`)
6. String matching (`STARTS WITH`, `ENDS WITH`, `CONTAINS`, `=~`)
7. IS NULL, IS NOT NULL
8. IN
9. AND
10. OR

**Error Handling**:
\`\`\`zig
pub const ParserError = error{
    UnexpectedToken,
    UnexpectedEOF,
    InvalidSyntax,
    UnclosedString,
    InvalidNumber,
    TooManyNestedExpressions,
};

fn reportError(self: *Parser, err: ParserError) void {
    const token = self.current_token;
    std.log.err(
        "Parse error at line {d}, column {d}: {s}",
        .{ token.line, token.column, @errorName(err) }
    );
}
\`\`\`

### GQL Compliance

**ISO/IEC 39075:2024 Compliance**: 100% (70/70 tests passing)

**Supported Features**:
- All GQL keywords (105+)
- Graph pattern matching (nodes, relationships, paths)
- Variable-length path patterns (`-[*1..5]->`)
- Path quantifiers (SHORTEST, ANY, WALK, TRAIL, ACYCLIC, SIMPLE)
- Complex expressions and operators
- Aggregation functions (COUNT, SUM, AVG, MIN, MAX)
- Subqueries and pattern comprehensions
- Set operations (UNION, INTERSECT, EXCEPT)
- Temporal data types (DATE, TIME, DATETIME)
- Spatial data types (POINT)

## Component 2: Query Planner

### Logical Plan Generation

The query planner (`src/planner/`) transforms the AST into a logical query plan.

**Implementation Location**: `src/planner/` (multiple files, ~3,500 LOC total)

**Key Files**:
- `src/planner/optimizer.zig` (609 LOC) - Query optimization
- `src/planner/cbo.zig` (760 LOC) - Cost-based optimization
- `src/planner/cost_model.zig` (594 LOC) - Cost estimation
- `src/planner/pipeline.zig` (750 LOC) - Execution pipeline
- `src/planner/adaptive.zig` (668 LOC) - Adaptive query execution

**Logical Plan Structure**:
\`\`\`
┌─────────────────┐
│ Return (project)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ OrderBy         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Filter (WHERE)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Expand (edges)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Scan (nodes)    │
└─────────────────┘
\`\`\`

**Plan Operators**:

1. **Scan Operators**:
   - `NodeScan`: Full node label scan
   - `IndexSeek`: Index-based lookup
   - `VectorIndexScan`: HNSW vector search
   - `SpatialIndexScan`: R-tree spatial search
   - `FullTextScan`: Full-text index search

2. **Join Operators**:
   - `NestedLoopJoin`: Simple nested iteration
   - `HashJoin`: Hash-based join
   - `MergeJoin`: Sort-merge join
   - `ExpandRelationships`: Graph edge traversal

3. **Filter Operators**:
   - `Filter`: Predicate evaluation
   - `RLSFilter`: Row-level security enforcement

4. **Aggregation Operators**:
   - `HashAggregate`: Hash-based aggregation
   - `SortAggregate`: Sort-based aggregation
   - `StreamAggregate`: Streaming aggregation

5. **Sort Operators**:
   - `Sort`: General sorting
   - `TopK`: Top-K optimization

6. **Set Operators**:
   - `Union`: Set union
   - `Intersect`: Set intersection
   - `Except`: Set difference

### Semantic Analysis

**Type Checking**:
\`\`\`zig
fn checkTypes(expr: Expression, context: *SemanticContext) TypeError!Type {
    return switch (expr) {
        .Literal => |lit| inferLiteralType(lit),
        .Property => |prop| checkPropertyAccess(prop, context),
        .Binary => |bin| checkBinaryOperation(bin, context),
        .FunctionCall => |call| checkFunctionCall(call, context),
        // ... other expression types
    };
}

fn checkBinaryOperation(bin: BinaryExpression, context: *SemanticContext) TypeError!Type {
    const left_type = try checkTypes(bin.left, context);
    const right_type = try checkTypes(bin.right, context);

    return switch (bin.operator) {
        .Plus, .Minus, .Multiply, .Divide => {
            if (!isNumeric(left_type) or !isNumeric(right_type)) {
                return error.TypeMismatch;
            }
            return promoteNumericTypes(left_type, right_type);
        },
        .And, .Or => {
            if (left_type != .Boolean or right_type != .Boolean) {
                return error.TypeMismatch;
            }
            return .Boolean;
        },
        // ... other operators
    };
}
\`\`\`

**Validation Checks**:
- Variable binding validation
- Property existence checking
- Function signature validation
- Aggregate function context validation
- Constraint validation

## Component 3: Query Optimizer

### Cost-Based Optimization (CBO)

**Implementation Location**: `src/planner/cbo.zig` (760 LOC)

**Optimization Strategies**:

1. **Predicate Pushdown**:
\`\`\`
Before:
  Filter (age > 30)
    ├─ Expand (KNOWS)
       └─ Scan (Person)

After:
  Expand (KNOWS)
    └─ Filter (age > 30)  ← Pushed down
       └─ Scan (Person)
\`\`\`

2. **Index Selection**:
\`\`\`zig
fn selectIndex(scan: ScanOperator, stats: *Statistics) ?Index {
    var best_index: ?Index = null;
    var best_cost = std.math.inf(f64);

    for (available_indexes) |index| {
        const selectivity = estimateSelectivity(scan.predicate, index, stats);
        const cost = estimateIndexCost(index, selectivity);

        if (cost < best_cost) {
            best_cost = cost;
            best_index = index;
        }
    }

    return best_index;
}
\`\`\`

3. **Join Order Optimization**:
\`\`\`zig
fn optimizeJoinOrder(joins: []Join, stats: *Statistics) []Join {
    // Dynamic programming approach for join order
    const n = joins.len;
    var dp = std.ArrayList(JoinPlan).init(allocator);

    // Initialize with single-table access
    for (joins) |join| {
        const plan = JoinPlan{
            .tables = [1]Table{join.table},
            .cost = estimateTableScanCost(join.table, stats),
        };
        dp.append(plan);
    }

    // Build up join combinations
    var size: usize = 2;
    while (size <= n) : (size += 1) {
        // Find best join order for each subset of size 'size'
        // ... dynamic programming logic
    }

    return dp.items[n - 1].plan;
}
\`\`\`

### Cost Model

**Implementation Location**: `src/planner/cost_model.zig` (594 LOC)

**Cost Factors**:

1. **I/O Cost**:
\`\`\`zig
fn estimateIOCost(operator: Operator) f64 {
    return switch (operator) {
        .NodeScan => estimateFullScanCost(),
        .IndexSeek => estimateIndexSeekCost(),
        .ExpandRelationships => estimateEdgeTraversalCost(),
        // ... other operators
    };
}

fn estimateFullScanCost() f64 {
    const pages = node_count / nodes_per_page;
    return @intToFloat(f64, pages) * io_cost_per_page;
}

fn estimateIndexSeekCost(index: Index, selectivity: f64) f64 {
    const tree_height = @log2(@intToFloat(f64, index.entry_count));
    const leaf_pages = @intToFloat(f64, index.entry_count) * selectivity / entries_per_page;
    return tree_height * io_cost_per_page + leaf_pages * io_cost_per_page;
}
\`\`\`

2. **CPU Cost**:
\`\`\`zig
fn estimateCPUCost(operator: Operator) f64 {
    return switch (operator) {
        .Filter => |filter| estimateFilterCost(filter),
        .HashJoin => |join| estimateHashJoinCost(join),
        .Sort => |sort| estimateSortCost(sort),
        // ... other operators
    };
}

fn estimateFilterCost(filter: FilterOperator) f64 {
    const rows = estimateRowCount(filter.input);
    const complexity = estimatePredicateComplexity(filter.predicate);
    return rows * complexity * cpu_cost_per_predicate;
}

fn estimateSortCost(sort: SortOperator) f64 {
    const rows = estimateRowCount(sort.input);
    return rows * @log2(@intToFloat(f64, rows)) * cpu_cost_per_comparison;
}
\`\`\`

3. **Memory Cost**:
\`\`\`zig
fn estimateMemoryCost(operator: Operator) f64 {
    return switch (operator) {
        .HashJoin => estimateHashTableSize(),
        .Sort => estimateSortBufferSize(),
        .HashAggregate => estimateAggregationHashTableSize(),
        // ... other operators
    };
}
\`\`\`

### Statistics Collection

**Implementation Location**: `src/server/index_optimizer.zig` (2,444 LOC)

**Collected Statistics**:
- Node label cardinalities
- Relationship type counts
- Property value distributions
- Index selectivity
- Data skew metrics

**Statistics Update**:
\`\`\`gql
-- Manual statistics update
CALL db.stats.update()

-- Automatic update (configured in server)
statistics:
  auto_update: true
  update_threshold: 10000  -- Update after 10k modifications
\`\`\`

## Component 4: Query Executor

### Execution Engine

**Implementation Location**: `src/execution/` (multiple files, ~10,000 LOC total)

**Key Files**:
- `src/execution.zig` (1,723 LOC) - Main execution logic
- `src/execution/path_and_call_operations.zig` (4,725 LOC) - Path operations
- `src/execution/match_operations.zig` (2,015 LOC) - MATCH execution
- `src/execution/crud_operations.zig` (1,876 LOC) - CREATE/UPDATE/DELETE

**Execution Model**:

Geode uses a **volcano-style iterator model** with pipelining:

\`\`\`zig
pub const Executor = struct {
    plan: ExecutionPlan,
    context: *ExecutionContext,

    pub fn execute(self: *Executor) !ResultSet {
        return self.executeOperator(self.plan.root);
    }

    fn executeOperator(self: *Executor, operator: Operator) !ResultSet {
        return switch (operator) {
            .Scan => self.executeScan(operator.Scan),
            .Filter => self.executeFilter(operator.Filter),
            .Expand => self.executeExpand(operator.Expand),
            .Join => self.executeJoin(operator.Join),
            .Aggregate => self.executeAggregate(operator.Aggregate),
            .Sort => self.executeSort(operator.Sort),
            .Project => self.executeProject(operator.Project),
        };
    }
};
\`\`\`

**Execution Operators**:

1. **Node Scan**:
\`\`\`zig
fn executeScan(self: *Executor, scan: ScanOperator) !ResultSet {
    var results = std.ArrayList(Row).init(self.allocator);

    // Iterate through nodes
    var iter = try self.context.storage.nodeIterator(scan.label);
    while (try iter.next()) |node| {
        // Apply filter if present
        if (scan.filter) |filter| {
            const matches = try self.evaluatePredicate(filter, node);
            if (!matches) continue;
        }

        try results.append(Row{ .node = node });
    }

    return ResultSet{ .rows = results.items };
}
\`\`\`

2. **Index Seek**:
\`\`\`zig
fn executeIndexSeek(self: *Executor, seek: IndexSeekOperator) !ResultSet {
    var results = std.ArrayList(Row).init(self.allocator);

    // Use index to find matching nodes
    const index = self.context.indexes.get(seek.index_name);
    const keys = try self.extractIndexKeys(seek.predicate);

    for (keys) |key| {
        const node_ids = try index.lookup(key);
        for (node_ids) |node_id| {
            const node = try self.context.storage.getNode(node_id);
            try results.append(Row{ .node = node });
        }
    }

    return ResultSet{ .rows = results.items };
}
\`\`\`

3. **Relationship Expansion**:
\`\`\`zig
fn executeExpand(self: *Executor, expand: ExpandOperator) !ResultSet {
    var results = std.ArrayList(Row).init(self.allocator);

    // Get source nodes
    const input = try self.executeOperator(expand.input);

    for (input.rows) |row| {
        const source_node = row.node;

        // Expand relationships
        var rel_iter = try self.context.storage.relationshipIterator(
            source_node.id,
            expand.direction,
            expand.rel_type
        );

        while (try rel_iter.next()) |relationship| {
            const target_node = try self.context.storage.getNode(
                relationship.target_id
            );

            try results.append(Row{
                .node = source_node,
                .relationship = relationship,
                .target = target_node,
            });
        }
    }

    return ResultSet{ .rows = results.items };
}
\`\`\`

4. **Hash Join**:
\`\`\`zig
fn executeHashJoin(self: *Executor, join: HashJoinOperator) !ResultSet {
    var results = std.ArrayList(Row).init(self.allocator);

    // Build phase: build hash table from smaller input
    const build_input = try self.executeOperator(join.build_side);
    var hash_table = std.AutoHashMap(u64, []Row).init(self.allocator);

    for (build_input.rows) |row| {
        const key = try self.extractJoinKey(row, join.build_key);
        const entry = hash_table.getOrPut(key) catch unreachable;
        if (!entry.found_existing) {
            entry.value_ptr.* = std.ArrayList(Row).init(self.allocator);
        }
        try entry.value_ptr.append(row);
    }

    // Probe phase: probe hash table with larger input
    const probe_input = try self.executeOperator(join.probe_side);
    for (probe_input.rows) |probe_row| {
        const key = try self.extractJoinKey(probe_row, join.probe_key);
        if (hash_table.get(key)) |build_rows| {
            for (build_rows) |build_row| {
                try results.append(try self.mergeRows(build_row, probe_row));
            }
        }
    }

    return ResultSet{ .rows = results.items };
}
\`\`\`

5. **Aggregation**:
\`\`\`zig
fn executeAggregate(self: *Executor, agg: AggregateOperator) !ResultSet {
    var results = std.ArrayList(Row).init(self.allocator);

    // Get input rows
    const input = try self.executeOperator(agg.input);

    // Build hash table for grouping
    var groups = std.AutoHashMap(GroupKey, AggregateState).init(self.allocator);

    for (input.rows) |row| {
        // Extract grouping key
        const group_key = try self.extractGroupKey(row, agg.group_by);

        // Get or create aggregate state
        const entry = groups.getOrPut(group_key) catch unreachable;
        if (!entry.found_existing) {
            entry.value_ptr.* = AggregateState.init(agg.aggregates);
        }

        // Update aggregate state
        try entry.value_ptr.update(row, agg.aggregates);
    }

    // Produce output rows
    var iter = groups.iterator();
    while (iter.next()) |entry| {
        const final_values = try entry.value_ptr.finalize();
        try results.append(Row{
            .group_key = entry.key_ptr.*,
            .aggregates = final_values,
        });
    }

    return ResultSet{ .rows = results.items };
}
\`\`\`

### Expression Evaluation

**Implementation Location**: `src/eval.zig` (3,332 LOC)

**Evaluator**:
\`\`\`zig
pub fn evaluateExpression(
    expr: Expression,
    context: *EvaluationContext
) EvaluationError!Value {
    return switch (expr) {
        .Literal => |lit| Value.fromLiteral(lit),
        .Property => |prop| evaluatePropertyAccess(prop, context),
        .Binary => |bin| evaluateBinaryExpression(bin, context),
        .FunctionCall => |call| evaluateFunctionCall(call, context),
        .CaseExpression => |case| evaluateCaseExpression(case, context),
        .ListComprehension => |comp| evaluateListComprehension(comp, context),
        // ... other expression types
    };
}

fn evaluateBinaryExpression(
    bin: BinaryExpression,
    context: *EvaluationContext
) EvaluationError!Value {
    const left = try evaluateExpression(bin.left, context);
    const right = try evaluateExpression(bin.right, context);

    return switch (bin.operator) {
        .Plus => try addValues(left, right),
        .Minus => try subtractValues(left, right),
        .Multiply => try multiplyValues(left, right),
        .Divide => try divideValues(left, right),
        .Equal => Value.fromBool(try compareValues(left, right, .Equal)),
        .NotEqual => Value.fromBool(try compareValues(left, right, .NotEqual)),
        // ... other operators
    };
}
\`\`\`

## Component 5: Distributed Query Execution

### Distributed Query Coordinator

**Implementation Location**: `src/distributed/enhanced_query_coordinator.zig` (750 LOC)

**Distributed Execution Flow**:

\`\`\`
┌───────────────────────┐
│ Distributed Coordinator│
└──────────┬────────────┘
           │
           ▼
    ┌─────────────────┐
    │ Query Analysis  │ ← Determine distribution strategy
    └─────────┬───────┘
              │
              ▼
    ┌─────────────────┐
    │ Shard Pruning   │ ← Eliminate unnecessary shards
    └─────────┬───────┘
              │
              ▼
    ┌─────────────────┐
    │ Scatter Phase   │ ← Send sub-queries to shards
    └─────────┬───────┘
              │
      ┌───────┴───────┬───────┐
      ▼               ▼       ▼
  ┌────────┐     ┌────────┐  ┌────────┐
  │Shard 1 │     │Shard 2 │  │Shard N │
  └────┬───┘     └────┬───┘  └────┬───┘
       │              │           │
       └───────┬──────┴───────────┘
               │
               ▼
    ┌─────────────────┐
    │ Gather Phase    │ ← Collect results
    └─────────┬───────┘
              │
              ▼
    ┌─────────────────┐
    │ Result Merging  │ ← Merge and order results
    └─────────┬───────┘
              │
              ▼
    ┌─────────────────┐
    │ Final Results   │
    └─────────────────┘
\`\`\`

**Shard Pruning**:
\`\`\`zig
fn pruneShards(
    query: QueryPlan,
    shards: []Shard,
    stats: *Statistics
) []Shard {
    var relevant_shards = std.ArrayList(Shard).init(allocator);

    for (shards) |shard| {
        // Analyze query predicates
        const shard_matches = analyzeShardRelevance(query, shard, stats);

        if (shard_matches) {
            try relevant_shards.append(shard);
        }
    }

    return relevant_shards.items;
}
\`\`\`

**Result Merging Strategies**:

1. **Union All** (Simple Concatenation):
\`\`\`zig
fn unionAllMerge(shard_results: []ResultSet) ResultSet {
    var merged = ResultSet.init(allocator);

    for (shard_results) |result| {
        try merged.append(result.rows);
    }

    return merged;
}
\`\`\`

2. **Union Distinct** (Deduplication):
\`\`\`zig
fn unionDistinctMerge(shard_results: []ResultSet) ResultSet {
    var seen = std.AutoHashMap(RowHash, void).init(allocator);
    var merged = ResultSet.init(allocator);

    for (shard_results) |result| {
        for (result.rows) |row| {
            const hash = hashRow(row);
            if (!seen.contains(hash)) {
                try seen.put(hash, {});
                try merged.append(row);
            }
        }
    }

    return merged;
}
\`\`\`

3. **Merge Sorted** (K-way Merge):
\`\`\`zig
fn mergeSorted(shard_results: []ResultSet, order_by: OrderBy) ResultSet {
    var merged = ResultSet.init(allocator);
    var heap = PriorityQueue(Row).init(allocator, compareRows(order_by));

    // Initialize heap with first row from each shard
    for (shard_results) |result| {
        if (result.rows.len > 0) {
            try heap.add(result.rows[0]);
        }
    }

    // K-way merge
    while (heap.removeOrNull()) |row| {
        try merged.append(row);

        // Add next row from same shard
        const shard_idx = row.shard_idx;
        const next_idx = row.idx_in_shard + 1;
        if (next_idx < shard_results[shard_idx].rows.len) {
            try heap.add(shard_results[shard_idx].rows[next_idx]);
        }
    }

    return merged;
}
\`\`\`

### Distributed Transaction Coordination

**Two-Phase Commit**:
\`\`\`zig
fn executeDistributedTransaction(
    queries: []QueryPlan,
    shards: []Shard
) TransactionError!void {
    // Phase 1: Prepare
    for (shards) |shard| {
        const prepared = try shard.prepare(queries);
        if (!prepared) {
            // Abort on all shards
            for (shards) |s| {
                try s.abort();
            }
            return error.TransactionAborted;
        }
    }

    // Phase 2: Commit
    for (shards) |shard| {
        try shard.commit();
    }
}
\`\`\`

## Performance Characteristics

### Parser Performance

| Input Size | Parse Time | Tokens/sec |
|------------|------------|------------|
| 100 bytes | 10μs | 10M |
| 1 KB | 100μs | 10M |
| 10 KB | 1ms | 10M |
| 100 KB | 10ms | 10M |

### Optimizer Performance

| Joins | Optimization Time | Considered Plans |
|-------|-------------------|------------------|
| 2 | <1ms | 2 |
| 4 | ~5ms | 12 |
| 6 | ~50ms | 720 |
| 8 | ~500ms | 40,320 |

**Note**: Uses dynamic programming for join order optimization with pruning.

### Executor Performance

| Operation | Throughput | Latency (P50) | Latency (P99) |
|-----------|------------|---------------|---------------|
| Index Seek | 100k ops/s | 0.01ms | 0.1ms |
| Full Scan | 1M nodes/s | 1ms | 10ms |
| Hash Join | 500k rows/s | 2ms | 20ms |
| Aggregation | 1M rows/s | 1ms | 10ms |

### Distributed Query Performance

| Shards | Query Time | Speedup | Efficiency |
|--------|------------|---------|------------|
| 1 | 100ms | 1.0x | 100% |
| 2 | 60ms | 1.67x | 83% |
| 4 | 35ms | 2.86x | 71% |
| 8 | 20ms | 5.0x | 62% |

## Monitoring and Debugging

### EXPLAIN Output

\`\`\`gql
EXPLAIN MATCH (p:Person)-[:KNOWS]->(f:Person)
WHERE p.age > 30 AND f.city = 'San Francisco'
RETURN p.name, f.name
ORDER BY p.name
LIMIT 10
\`\`\`

**Output**:
\`\`\`
| plan                          |
|-------------------------------|
| EXPLAIN                       |
| TopK (limit: 10)              |
|   Sort (key: p.name)          |
|     Project (p.name, f.name)  |
|       Filter (f.city = 'SF')  |
|         Expand (KNOWS)        |
|           Filter (p.age > 30) |
|             IndexSeek (Person)|
\`\`\`

### PROFILE Output

\`\`\`gql
PROFILE MATCH (p:Person)-[:KNOWS]->(f:Person)
WHERE p.age > 30 AND f.city = 'San Francisco'
RETURN p.name, f.name
ORDER BY p.name
LIMIT 10
\`\`\`

**Output**:
\`\`\`
| metric              | value |
|---------------------|-------|
| rows_returned       | 10    |
| rows_scanned        | 5420  |
| index_seeks         | 1     |
| relationships_expanded | 5420 |
| execution_time_ms   | 15    |
\`\`\`

### Query Logging

Enable query logging for debugging:

\`\`\`yaml
# geode.yaml
logging:
  query_log: true
  slow_query_threshold_ms: 100
  log_level: debug
\`\`\`

**Log Output**:
\`\`\`
[2026-01-24T10:30:00Z] INFO  Query received: MATCH (p:Person) WHERE p.age > 30 RETURN p
[2026-01-24T10:30:00Z] DEBUG Parse time: 0.5ms
[2026-01-24T10:30:00Z] DEBUG Plan time: 2.1ms
[2026-01-24T10:30:00Z] DEBUG Execute time: 12.3ms
[2026-01-24T10:30:00Z] INFO  Query completed in 14.9ms, returned 42 rows
\`\`\`

## Best Practices

### Query Optimization

1. **Use Indexes Wisely**:
\`\`\`gql
-- Create index for frequent predicates
CREATE INDEX ON :Person(email)

-- Query uses index automatically
MATCH (p:Person {email: 'alice@example.com'}) RETURN p
\`\`\`

2. **Filter Early**:
\`\`\`gql
-- Good: Filter before expansion
MATCH (p:Person)
WHERE p.age > 30
MATCH (p)-[:KNOWS]->(f)
RETURN f.name

-- Bad: Filter after expansion
MATCH (p:Person)-[:KNOWS]->(f)
WHERE p.age > 30
RETURN f.name
\`\`\`

3. **Use LIMIT**:
\`\`\`gql
-- Add LIMIT to prevent large result sets
MATCH (p:Person)
RETURN p
ORDER BY p.name
LIMIT 100
\`\`\`

4. **Avoid Cartesian Products**:
\`\`\`gql
-- Bad: Cartesian product
MATCH (p:Person), (c:Company)
RETURN p.name, c.name

-- Good: Use relationships
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
RETURN p.name, c.name
\`\`\`

### Distributed Queries

1. **Shard Pruning**:
\`\`\`gql
-- Include shard key in predicates
MATCH (p:Person {shard_id: 1})  -- Prunes to single shard
WHERE p.age > 30
RETURN p
\`\`\`

2. **Local Aggregation**:
\`\`\`gql
-- Aggregation pushes down to shards
MATCH (p:Person)
RETURN p.department, count(*) AS emp_count
GROUP BY p.department
\`\`\`

## Next Steps

1. **Query Tuning** - Use EXPLAIN/PROFILE to optimize queries
2. **Index Strategy** - Create indexes for common queries
3. **Distributed Setup** - Configure sharding for scale
4. **Monitoring** - Set up query logging and metrics
5. **Performance Testing** - Benchmark with realistic workloads

**Related Documentation**:
- [Query Optimization](/docs/query/performance-tuning)
- [Index Optimization](/docs/tutorials/index-optimization)
- [Distributed Architecture](/docs/architecture/distributed-architecture)
- [EXPLAIN/PROFILE](/docs/query/explain-profile)

---

*Last Updated: January 2026*
*Implementation: Geode v0.18.0+*
*Status: Production-ready - 100% GQL compliance*
