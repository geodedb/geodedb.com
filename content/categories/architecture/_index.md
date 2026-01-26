---
title: "System Architecture & Design"
description: "Deep dive into Geode's internal architecture including query engine, storage layer, QUIC protocol, concurrency control, and distributed system design principles for graph database implementation."
keywords:
  - architecture
  - query engine
  - storage layer
  - distributed systems
  - wire protocol
  - system design
  - MVCC
  - SSI
  - QUIC
  - WAL
  - database internals
  - graph database architecture
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/architecture/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# System Architecture & Design

The **System Architecture & Design** category provides comprehensive documentation of Geode's internal architecture, implementation decisions, and design principles. Understanding Geode's architecture enables effective performance optimization, informed troubleshooting, strategic deployment decisions, and contributions to the codebase. From the QUIC wire protocol through query execution and storage management, these resources explain how Geode implements a production-ready graph database.

## Overview

Geode's architecture reflects careful design choices prioritizing **correctness**, **performance**, and **maintainability**. Written in Zig for memory safety and predictable performance, Geode implements a layered architecture with clear separation of concerns:

**Wire Protocol Layer**: QUIC-based transport handles encrypted, multiplexed connections

**Query Engine**: Parses GQL queries, optimizes execution plans, and coordinates query execution

**Transaction Layer**: Provides ACID guarantees using Multi-Version Concurrency Control (MVCC) with Serializable Snapshot Isolation (SSI)

**Storage Layer**: Manages persistent data structures including B+trees, Write-Ahead Log (WAL), and memory-mapped files

**Index Layer**: Implements specialized indexes including B+tree for properties, HNSW for vector search, and BM25 for full-text search

This layered design enables independent optimization and testing of each component while maintaining clean interfaces between layers.

## Architectural Principles

### Design Philosophy

**Simplicity**: Prefer simple, understandable solutions over complex optimizations. Simple systems are easier to reason about, test, and maintain.

**Correctness First**: Ensure correctness before optimization. All optimizations must preserve semantics and maintain ACID guarantees.

**Performance by Design**: Design for performance from the start. Retrofitting performance into slow architectures is difficult.

**Evidence-Based Development**: All features backed by tests. CANARY markers track requirements and evidence throughout the codebase.

**Standards Compliance**: Full ISO/IEC 39075:2024 GQL compliance ensures portability and predictable behavior.

### Key Architectural Decisions

**Zig Programming Language**: Memory-safe systems programming with predictable performance and no hidden control flow

**QUIC-Only Transport**: Eliminate TCP complexity; QUIC provides multiplexing, encryption, and faster connection establishment

**MVCC with SSI**: High read concurrency without locks; serializable isolation without performance penalty

**Write-Ahead Logging**: Ensure durability with minimal write amplification; sequential writes to append-only log

**Cost-Based Optimization**: Query optimizer uses statistics and cost models to choose optimal execution plans

**Modular Design**: Clean interfaces between components enable independent development and testing

## System Architecture Documentation

### Core Architecture Guides

**[Architecture Overview](/docs/architecture/)**
Entry point for architecture documentation covering all major subsystems and their interactions.

**[Query Execution Architecture](/docs/architecture/query-execution/)**
Complete query execution pipeline from parsing through result delivery. Covers lexer, parser, optimizer, and executor design.

**[Performance and Scaling](/docs/architecture/performance-and-scaling/)**
System-level performance architecture including query engine optimization, storage tuning, caching strategies, and distributed scaling.

**[Distributed Architecture](/docs/architecture/distributed-architecture/)**
Distributed system design including sharding strategies, replication protocols, consistency models, and cross-shard query execution.

**[Wire Protocol Specification](/docs/architecture/wire-protocol/)**
Complete QUIC-based wire protocol documentation including message formats, connection lifecycle, and error handling.

**[CLI Design](/docs/architecture/cli-design/)**
Command-line interface architecture including REPL implementation, shell integration, and interactive features.

## Query Engine Architecture

### Lexical Analysis and Parsing

**Lexer**: Tokenizes GQL source into tokens:
- Keywords (MATCH, WHERE, RETURN)
- Identifiers (variable names, labels)
- Literals (strings, numbers, booleans)
- Operators (comparison, arithmetic, logical)
- Punctuation (parentheses, braces, commas)

**Parser**: Builds Abstract Syntax Tree (AST) from tokens:
- Recursive descent parsing
- Operator precedence handling
- Error recovery and reporting
- Location tracking for error messages

**AST**: Structured representation of query:
- Query clauses (MATCH, WHERE, RETURN)
- Patterns (nodes, relationships, paths)
- Expressions (comparisons, arithmetic, function calls)
- Type information for semantic analysis

### Query Optimization

**Logical Optimization**: Transforms AST into optimized logical plan:
- Pattern simplification and normalization
- Predicate pushdown (filter early)
- Constant folding and expression simplification
- Subquery flattening where possible
- Common subexpression elimination

**Cost-Based Optimization**: Chooses execution strategy based on cost estimates:
- Cardinality estimation using statistics
- Index selection based on selectivity
- Join order optimization
- Join algorithm selection (hash, nested loop, merge)
- Parallel execution planning

**Physical Planning**: Generates executable operator tree:
- Operator selection (Scan, Seek, Join, Filter, Aggregate)
- Memory allocation and buffer sizing
- Parallelization and work distribution
- Cache-aware execution strategies

### Query Execution

**Operator Pipeline**: Query execution as operator pipeline:
- Pull-based execution (demand-driven)
- Volcano-style iterator model
- Pipelined execution (no materialization)
- Memory-bounded execution

**Key Operators**:
- **Scan**: Iterate all nodes/relationships
- **Seek**: Index-based lookup
- **Filter**: Apply predicates
- **Join**: Combine patterns (hash, nested loop, merge)
- **Aggregate**: Grouping and aggregation functions
- **Sort**: Order results
- **Limit**: Bound result size

**Parallelization**:
- Intra-query parallelism (multiple threads per query)
- Inter-query parallelism (multiple concurrent queries)
- Parallel scan and aggregate operators
- Work-stealing for load balancing

## Storage Architecture

### Data Structures

**B+Tree Storage**: Primary storage structure for nodes and relationships:
- Self-balancing tree ensures O(log n) access
- Sequential leaf nodes for range scans
- High fan-out reduces tree depth
- Copy-on-write for MVCC

**Write-Ahead Log (WAL)**: Ensures durability:
- Append-only sequential writes
- All mutations logged before applying
- Crash recovery replays WAL
- Periodic checkpointing reduces replay time

**Memory-Mapped Files**: Efficient data access:
- OS manages page cache
- Zero-copy reads from cache
- Write-back buffering
- Large address space utilization

**Index Structures**:
- **B+tree indexes**: Property and relationship type indexes
- **HNSW indexes**: Vector similarity search
- **BM25 indexes**: Full-text search
- **Hash indexes**: Equality lookups

### MVCC and Transaction Management

**Multi-Version Concurrency Control (MVCC)**:
- Each transaction sees consistent snapshot
- Writes create new versions, don't modify in-place
- Readers never block writers
- Writers don't block readers
- Garbage collection reclaims old versions

**Serializable Snapshot Isolation (SSI)**:
- Strongest isolation level
- Prevents all anomalies (dirty read, non-repeatable read, phantom read, write skew)
- Implemented via predicate locking and conflict detection
- Minimal performance overhead compared to snapshot isolation

**Transaction Lifecycle**:
1. **BEGIN**: Allocate transaction ID, create snapshot
2. **Execute**: Read from snapshot, buffer writes
3. **Validation**: Check for conflicts using SSI
4. **COMMIT**: Write to WAL, apply changes, release locks
5. **ROLLBACK**: Discard buffered writes, release locks

**Lock Management**:
- Intent locks for coarse-grained locking
- Predicate locks for range queries
- Deadlock detection and resolution
- Lock escalation for large updates

### Write-Ahead Logging (WAL)

**WAL Design**:
- Sequential append-only log
- All mutations logged before application
- Log entries contain before/after images
- Logical logging (operations) not physical (pages)

**Crash Recovery**:
1. Read WAL from last checkpoint
2. Redo committed transactions
3. Undo uncommitted transactions
4. Restore database to consistent state

**Checkpointing**:
- Periodic flush of dirty pages to disk
- Creates recovery point in WAL
- Truncates WAL to reclaim space
- Configurable interval (time or WAL size)

**Log Shipping**: WAL enables replication:
- Stream WAL to replicas
- Replicas replay log for replication
- Asynchronous replication for read replicas
- Synchronous replication for high availability

## Network Architecture

### QUIC Protocol

**Why QUIC Over TCP**:
- **Multiplexing**: Multiple streams without head-of-line blocking
- **Encryption**: TLS 1.3 built-in, mandatory encryption
- **Fast connection**: 0-RTT and 1-RTT connection establishment
- **Connection migration**: Survive network changes
- **Congestion control**: Modern algorithms (BBR, Cubic)

**Connection Lifecycle**:
1. **Handshake**: TLS 1.3 handshake, negotiate parameters
2. **Streams**: Multiplex requests on single connection
3. **Flow control**: Per-stream and connection-level
4. **Keepalive**: Periodic pings maintain connection
5. **Closure**: Graceful shutdown or idle timeout

**Stream Management**:
- Bidirectional streams for request/response
- Unidirectional streams for server push
- Stream prioritization for multiplexing
- Flow control prevents overwhelming receiver

### Wire Protocol

**Message Format**: JSON line protocol:
- One JSON object per line
- Request/response correlation via stream ID
- Type field indicates message kind
- Payload contains message-specific data

**Client Messages**:
- **HELLO**: Initial handshake with version negotiation
- **RUN_GQL**: Execute GQL query with parameters
- **PULL**: Fetch next batch of results
- **BEGIN/COMMIT/ROLLBACK**: Transaction control
- **PING**: Connection keepalive

**Server Responses**:
- **SCHEMA**: Query schema (column names, types)
- **BINDINGS**: Result rows (batched)
- **ERROR**: Error response with ISO status code
- **EXPLAIN**: Query execution plan
- **PROFILE**: Performance metrics

**Error Handling**:
- ISO GQL status codes for errors
- Detailed error messages with location
- Warnings for non-fatal issues
- Partial success for batch operations

## Index Architecture

### B+Tree Indexes

**Node Property Indexes**:
- Index on node properties (ID, email, etc.)
- Support equality and range queries
- Composite indexes for multi-column predicates
- Covering indexes include RETURN columns

**Relationship Type Indexes**:
- Index relationships by type
- Fast lookup of all relationships of given type
- Support for relationship property indexes

**Implementation**:
- Copy-on-write for MVCC
- Bulk loading for efficient creation
- Incremental maintenance on updates
- Statistics collection for optimizer

### HNSW Vector Indexes

**Hierarchical Navigable Small World (HNSW)**:
- Approximate nearest neighbor search
- Sublinear search time O(log n)
- High recall (>95%) with low latency
- Configurable accuracy/performance trade-off

**Index Structure**:
- Multi-layer graph structure
- Higher layers for coarse navigation
- Lower layers for fine-grained search
- Configurable layer count and connectivity

**Distance Metrics**:
- **Cosine similarity**: For normalized embeddings
- **Euclidean distance**: For Euclidean space
- **Inner product**: For unnormalized vectors

**Use Cases**:
- Semantic search (text embeddings)
- Recommendation systems (item embeddings)
- Image similarity (vision embeddings)
- Anomaly detection (outlier search)

### BM25 Full-Text Indexes

**BM25 Algorithm**:
- State-of-the-art text ranking
- Term frequency with saturation
- Inverse document frequency weighting
- Document length normalization

**Index Structure**:
- Inverted index (term → documents)
- Positional information for phrase queries
- Document length statistics
- Per-term statistics for IDF

**Text Processing**:
- Tokenization (word boundaries)
- Lowercasing and normalization
- Stopword removal (optional)
- Stemming (optional, configurable)

**Query Features**:
- Boolean queries (AND, OR, NOT)
- Phrase queries ("exact phrase")
- Wildcard queries (prefix matching)
- Fuzzy matching (edit distance)

## Concurrency and Parallelism

### Concurrency Control

**MVCC Benefits**:
- Readers never block writers
- Writers never block readers
- High read concurrency
- Predictable performance

**Isolation Levels**:
- **Serializable (SSI)**: Default, prevents all anomalies
- **Snapshot Isolation**: Faster but permits write skew
- **Read Committed**: Weakest, minimal overhead

**Conflict Detection**:
- Read-write conflicts (SSI)
- Write-write conflicts (all levels)
- Predicate conflicts (phantom protection)
- Abort conflicting transactions

### Parallelization Strategies

**Intra-Query Parallelism**:
- Parallel scans (partition data across threads)
- Parallel joins (partition build side)
- Parallel aggregations (local then global)
- Work-stealing for load balancing

**Inter-Query Parallelism**:
- Multiple concurrent queries
- Connection pooling
- Thread pool for query execution
- CPU affinity for cache locality

**I/O Parallelism**:
- Asynchronous I/O (io_uring on Linux)
- Parallel WAL writes
- Parallel checkpoint writes
- Prefetching for sequential scans

## Distributed Architecture

### Sharding Strategies

**Hash Sharding**: Distribute nodes by hash of ID:
- Uniform distribution
- Simple implementation
- No hotspots for random access
- Cross-shard queries for traversals

**Range Sharding**: Distribute nodes by ID range:
- Locality for sequential IDs
- Range queries on single shard
- Hotspots for sequential allocation

**Graph Sharding**: Co-locate connected components:
- Minimize cross-shard traversals
- Complex partitioning
- Rebalancing overhead
- Best for community-structured graphs

### Replication

**Read Replicas**:
- WAL shipping to replicas
- Eventually consistent reads
- Scale read throughput
- Failover for high availability

**Synchronous Replication**:
- Strong consistency
- Higher latency (wait for replica ACK)
- Data durability across nodes

**Asynchronous Replication**:
- Lower latency (don't wait for replica)
- Eventual consistency
- Risk of data loss on primary failure

### Distributed Query Execution

**Cross-Shard Queries**:
- Query coordinator on client node
- Ship subqueries to relevant shards
- Gather and merge results
- Distributed joins and aggregations

**Two-Phase Commit (2PC)**:
- Distributed transaction protocol
- Prepare phase: All participants vote
- Commit phase: Coordinator commits or aborts
- Ensures atomicity across shards

## Development Architecture

### Codebase Organization

**Zig Modules**:
```
geode/src/
├── cli/              # Command-line interface
├── query/            # Query engine
│   ├── lexer.zig     # Tokenization
│   ├── parser.zig    # Parsing
│   ├── optimizer.zig # Query optimization
│   └── executor.zig  # Query execution
├── storage/          # Storage layer
│   ├── btree.zig     # B+tree implementation
│   ├── wal.zig       # Write-ahead log
│   └── mvcc.zig      # MVCC and transactions
├── network/          # Network layer
│   ├── quic.zig      # QUIC protocol
│   └── protocol.zig  # Wire protocol
├── index/            # Index structures
│   ├── hnsw.zig      # Vector index
│   └── bm25.zig      # Full-text index
└── test/             # Test framework
```

### CANARY Governance

**Evidence-Based Development**:
- CANARY markers track requirements
- Each feature has corresponding test
- Traceability from requirement to implementation
- 1,735 CANARY markers track 2,190+ requirements

**Example CANARY Marker**:
```zig
// CANARY: REQ=REQ-XXX; FEATURE="PatternMatching"; ASPECT=BasicMatch; STATUS=TESTED; TEST=TestBasicNodePatternMatch; OWNER=engine; UPDATED=2026-01-24
// Requirement: Support basic node pattern matching
// Evidence: TestBasicNodePatternMatch
```

### Testing Strategy

**Test Pyramid**:
- **Unit tests**: 1,000+ tests for individual functions
- **Integration tests**: 500+ tests for component interactions
- **System tests**: 70 ISO GQL conformance tests
- **Performance tests**: Benchmark suite

**Test Coverage**: 97.4% (1,644/1,688 tests passing)

**ISO Conformance**: 100% (70/70 ISO tests passing)

## Related Documentation

### Architecture Deep Dives

- **[Query Execution](/docs/architecture/query-execution/)** - Query engine internals
- **[Performance and Scaling](/docs/architecture/performance-and-scaling/)** - Performance architecture
- **[Distributed Architecture](/docs/architecture/distributed-architecture/)** - Distributed systems
- **[Wire Protocol](/docs/architecture/wire-protocol/)** - QUIC protocol specification
- **[CLI Design](/docs/architecture/cli-design/)** - Command-line architecture

### Performance

- **[Performance Category](/categories/performance/)** - Performance optimization
- **[Query Optimization](/categories/query/)** - Query tuning
- **[Indexing Guide](/docs/query/indexing-and-optimization/)** - Index strategies

### Development

- **[Development Category](/categories/development/)** - Development workflow
- **[Contributing Category](/categories/contributing/)** - Contributing guide
- **[Zig Category](/categories/zig/)** - Zig language resources

### Operations

- **[Operations Category](/categories/operations/)** - Production operations
- **[Deployment Category](/categories/deployment-and-devops/)** - Deployment patterns
- **[Configuration Category](/categories/configuration/)** - System configuration

## Related Tags

- **[Architecture](/tags/architecture/)** - Architectural topics
- **[MVCC](/tags/mvcc/)** - Multi-Version Concurrency Control
- **[SSI](/tags/ssi/)** - Serializable Snapshot Isolation
- **[WAL](/tags/wal/)** - Write-Ahead Log
- **[QUIC](/tags/quic/)** - QUIC protocol
- **[Query Engine](/tags/query/)** - Query execution
- **[Storage](/tags/storage/)** - Storage architecture

## Architectural Resources

### Design Documents

- Architecture overview diagrams
- Component interaction flows
- Data structure specifications
- Protocol specifications

### Implementation Notes

- Design decisions and rationale
- Performance considerations
- Trade-off analysis
- Alternative approaches considered

### Future Architecture

- Planned enhancements
- Scalability roadmap
- Research directions
- Community feedback integration

## Contributing to Architecture

Understanding Geode's architecture enables effective contributions:

**Code Contributions**:
- Follow architectural patterns
- Maintain separation of concerns
- Add CANARY markers for features
- Write tests for all changes

**Architecture Discussions**:
- Propose improvements on GitHub
- Discuss trade-offs and alternatives
- Share performance analysis
- Review design documents

## Next Steps

**Understanding query execution?** Read [Query Execution Architecture](/docs/architecture/query-execution/) for complete pipeline documentation.

**Optimizing performance?** Check [Performance and Scaling](/docs/architecture/performance-and-scaling/) for architectural guidance.

**Deploying distributed?** Review [Distributed Architecture](/docs/architecture/distributed-architecture/) for sharding and replication.

**Contributing code?** See [Contributing](/categories/contributing/) for development guidelines.

**Learning Zig?** Browse [Zig Category](/categories/zig/) for language resources.

---

**Language**: Zig 0.15.1+
**Architecture**: Layered, modular design
**Concurrency**: MVCC with SSI
**Protocol**: QUIC with TLS 1.3
**Test Coverage**: 97.4%
**ISO Compliance**: 100%
**Last Updated**: January 2026
**Geode Version**: v0.18.0+
