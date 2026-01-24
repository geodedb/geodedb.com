---
title: "GQL Syntax Guide"
description: "Comprehensive GQL syntax guide: grammar, patterns, clauses, expressions, and complete language syntax for graph query development in Geode."
keywords:
  - GQL syntax
  - Graph Query Language syntax
  - GQL grammar
  - query syntax
  - pattern syntax
  - Geode syntax
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/gql-syntax/"
    noindex: false
---

Complete syntax guide for GQL (Graph Query Language) as implemented in Geode. This guide provides detailed grammar, syntax rules, and examples for writing correct GQL queries.

## Lexical Structure

### Identifiers

```gql
// Simple identifiers (alphanumeric, underscore)
user, user_name, userName, user123

// Quoted identifiers (any characters)
`user-name`, `user.name`, `my identifier with spaces`

// Case sensitivity
User ≠ user ≠ USER  // Identifiers are case-sensitive
```

### Keywords

Reserved words (case-insensitive):

```
MATCH, CREATE, DELETE, SET, REMOVE, MERGE, RETURN, WHERE, WITH, 
ORDER, BY, LIMIT, OFFSET, SKIP, ASC, DESC, AS, DISTINCT, UNION,
OPTIONAL, CASE, WHEN, THEN, ELSE, END, AND, OR, NOT, XOR, IN,
STARTS, WITH, ENDS, CONTAINS, IS, NULL, EXISTS, ALL, ANY, NONE,
SINGLE, TRUE, FALSE, COUNT, SUM, AVG, MIN, MAX, COLLECT,
BEGIN, COMMIT, ROLLBACK, TRANSACTION, SAVEPOINT, INDEX, CONSTRAINT,
UNIQUE, ON, ASSERT, DROP, SHOW, EXPLAIN, PROFILE
```

### Literals

```gql
// Integer
42, -17, 0, 9223372036854775807

// Float
3.14, -0.5, 1.23e10, 6.022e23

// String (single or double quotes)
'hello', "world", 'it\'s', "say \"hi\""

// Boolean
true, false, TRUE, FALSE

// Null
null, NULL

// List
[], [1, 2, 3], ['a', 'b', 'c'], [1, 'mixed', true]

// Map
{}, {key: 'value'}, {name: 'Alice', age: 30}
```

### Comments

```gql
// Single-line comment

/* Multi-line
   comment */

/* Nested /* comments */ are not supported */
```

## Pattern Syntax

### Node Patterns

```gql
// Grammar
(variable? labels? properties? where_clause?)

// Examples
()                               // Anonymous
(n)                             // Named variable
(n:User)                        // With label
(n:User:Admin)                  // Multiple labels
(n {age: 30})                   // With properties
(n:User {age: 30})             // Label and properties
(n WHERE n.age > 25)           // With WHERE clause
(n:User {city: 'NYC'} WHERE n.age > 25)  // Complete pattern
```

### Relationship Patterns

```gql
// Grammar
-[variable? types? properties? where_clause?]->    // Directed right
<-[variable? types? properties? where_clause?]-    // Directed left
-[variable? types? properties? where_clause?]-     // Undirected

// Examples
-->                                    // Anonymous directed
-[r]->                                // Named
-[r:KNOWS]->                          // With type
-[r:KNOWS|FOLLOWS]->                  // Multiple types
-[r {since: 2020}]->                  // With properties
-[r:KNOWS {since: 2020}]->           // Type and properties
-[r WHERE r.strength > 0.5]->        // With WHERE clause

// Variable-length
-[*]->                  // Any length
-[*1..3]->             // 1 to 3 hops
-[*..5]->              // Up to 5 hops
-[*3..]->              // 3 or more hops
-[:KNOWS*2..4]->       // With type and bounds
```

### Path Patterns

```gql
// Grammar
variable = (pattern_element)+

// Examples
path = (a)-[:KNOWS]->(b)
path = (a)-[:KNOWS*]->(b)-[:LIVES_IN]->(c)
path = (a)-[:KNOWS*1..3]-(b)

// Shortest path
path = SHORTEST (a)-[:KNOWS*]-(b)
paths = ALL SHORTEST (a)-[:KNOWS*]-(b)
```

## Query Clauses

### MATCH

```gql
// Syntax
MATCH pattern [WHERE condition]

// Examples
MATCH (n:User)
MATCH (a:User)-[r:KNOWS]->(b:User)
MATCH (a)-[:KNOWS*1..3]-(b)
MATCH (n) WHERE n.age > 25
```

### OPTIONAL MATCH

```gql
// Syntax
OPTIONAL MATCH pattern [WHERE condition]

// Example
MATCH (u:User)
OPTIONAL MATCH (u)-[:HAS_PROFILE]->(p:Profile)
RETURN u.name, p.bio  // p.bio is null if no profile
```

### WHERE

```gql
// Syntax
WHERE condition

// Examples
WHERE n.age > 25
WHERE n.age >= 18 AND n.age <= 65
WHERE n.email IS NOT NULL
WHERE n.role IN ['admin', 'moderator']
WHERE n.name STARTS WITH 'A'
WHERE n.email =~ '.*@example\\.com$'
WHERE EXISTS { (n)-[:FRIEND]->(:User) }
```

### RETURN

```gql
// Syntax
RETURN [DISTINCT] expression [AS alias] [, ...]

// Examples
RETURN n
RETURN n.name, n.age
RETURN n.name AS name, n.age AS age
RETURN DISTINCT n.role
RETURN COUNT(*) AS total
RETURN n, COLLECT(m) AS friends
```

### WITH

```gql
// Syntax
WITH [DISTINCT] expression [AS alias] [, ...]
[ORDER BY expression [ASC|DESC] [, ...]]
[LIMIT number]

// Examples
MATCH (u:User)-[:FRIEND]->(f)
WITH u, COUNT(f) AS friend_count
WHERE friend_count > 10
RETURN u.name, friend_count

// Chaining
MATCH (u:User)
WITH u, SIZE((u)-[:FRIEND]->()) AS friends
WHERE friends > 5
WITH u, friends, u.age / 10 AS age_group
RETURN age_group, AVG(friends) AS avg_friends
```

### ORDER BY

```gql
// Syntax
ORDER BY expression [ASC|DESC] [NULLS FIRST|LAST] [, ...]

// Examples
ORDER BY n.age
ORDER BY n.age DESC
ORDER BY n.last_name ASC, n.first_name ASC
ORDER BY n.created_at DESC NULLS LAST
```

### LIMIT and OFFSET

```gql
// Syntax
LIMIT number
OFFSET number  // or SKIP number

// Examples
LIMIT 10
LIMIT 20 OFFSET 40   // Pagination: page 3 (20 per page)
LIMIT $pageSize OFFSET $offset  // Parameterized
```

### UNION

```gql
// Syntax
query UNION [ALL] query

// Examples
MATCH (u:User) RETURN u.email
UNION
MATCH (a:Admin) RETURN a.email

// UNION ALL (keeps duplicates)
MATCH (u:User) RETURN u.email
UNION ALL
MATCH (a:Admin) RETURN a.email
```

## Data Modification Clauses

### CREATE

```gql
// Syntax
CREATE pattern

// Examples
CREATE (n:User {name: 'Alice', age: 30})
CREATE (a:User)-[r:KNOWS {since: 2024}]->(b:User)
CREATE (a)-[:FRIEND]->(b), (a)-[:COLLEAGUE]->(c)
```

### DELETE

```gql
// Syntax
DELETE expression [, ...]
DETACH DELETE expression [, ...]

// Examples
DELETE r                    // Delete relationship
DELETE n                    // Delete node (if no relationships)
DETACH DELETE n            // Delete node and all relationships
```

### SET

```gql
// Syntax
SET variable.property = expression
SET variable = map
SET variable += map
SET variable:Label

// Examples
SET n.name = 'New Name'
SET n.age = n.age + 1
SET n = {name: 'Alice', age: 30}      // Replace all properties
SET n += {city: 'NYC', verified: true} // Add/update properties
SET n:Admin                             // Add label
SET n:Admin:Verified                    // Add multiple labels
```

### REMOVE

```gql
// Syntax
REMOVE variable.property
REMOVE variable:Label

// Examples
REMOVE n.temporary_field
REMOVE n:Deprecated
```

### MERGE

```gql
// Syntax
MERGE pattern
[ON CREATE SET property = value]
[ON MATCH SET property = value]

// Examples
MERGE (u:User {email: 'alice@example.com'})
ON CREATE SET u.created_at = NOW()
ON MATCH SET u.last_seen = NOW()
RETURN u
```

## Expressions

### Comparison

```gql
n.age = 30
n.age <> 30    // or !=
n.age < 30
n.age > 30
n.age <= 30
n.age >= 30
n.email IS NULL
n.email IS NOT NULL
n.role IN ['admin', 'moderator']
n.age BETWEEN 18 AND 65
```

### Logical

```gql
condition1 AND condition2
condition1 OR condition2
NOT condition
condition1 XOR condition2
```

### String

```gql
n.name STARTS WITH 'A'
n.name ENDS WITH 'son'
n.name CONTAINS 'alice'
n.email =~ '^[a-z]+@example\\.com$'  // Regex
```

### Arithmetic

```gql
n.age + 10
n.price * 1.08    // Add 8% tax
n.balance - 100
n.total / n.count
n.value % 10      // Modulo
2 ^ 10            // Power
```

### List

```gql
[1, 2, 3]
list[0]           // First element
list[-1]          // Last element
list[1..3]        // Slice
list + [4, 5]     // Concatenation
x IN list         // Membership
SIZE(list)
```

### Map

```gql
{key: 'value', number: 42}
map.key
map['key']
KEYS(map)
VALUES(map)
```

### CASE

```gql
CASE
  WHEN condition1 THEN result1
  WHEN condition2 THEN result2
  ELSE default_result
END

// Simple CASE
CASE expression
  WHEN value1 THEN result1
  WHEN value2 THEN result2
  ELSE default_result
END
```

## Function Call Syntax

```gql
// Function call
function_name(argument1, argument2, ...)

// Examples
COUNT(*)
SUM(n.amount)
UPPER(n.name)
SUBSTRING(n.email, 0, POSITION('@', n.email))
COALESCE(n.nickname, n.username, 'Anonymous')
```

## Subquery Syntax

```gql
// EXISTS
WHERE EXISTS {
  pattern
  [WHERE condition]
}

// COUNT
COUNT {
  pattern
  [WHERE condition]
}

// Example
MATCH (u:User)
WHERE EXISTS {
  MATCH (u)-[:PURCHASED]->(p:Product)
  WHERE p.price > 1000
}
RETURN u
```

## Parameter Syntax

```gql
// Parameter placeholder
$parameter_name

// Examples
MATCH (u:User {id: $user_id}) RETURN u
WHERE u.age > $min_age AND u.age < $max_age
CREATE (u:User $user_properties)
```

## Schema Syntax

### Index

```gql
CREATE [index_type] INDEX [index_name]
FOR (variable:Label)
ON (variable.property [, variable.property, ...])
[OPTIONS {option: value, ...}]

// Examples
CREATE INDEX FOR (u:User) ON (u.email)
CREATE INDEX user_name_idx FOR (u:User) ON (u.name)
CREATE VECTOR INDEX FOR (d:Doc) ON (d.embedding) OPTIONS {metric: 'cosine'}
```

### Constraint

```gql
CREATE CONSTRAINT [constraint_name]
ON (variable:Label)
ASSERT constraint_type

// Examples
CREATE CONSTRAINT ON (u:User) ASSERT u.email IS UNIQUE
CREATE CONSTRAINT ON (u:User) ASSERT EXISTS(u.email)
CREATE CONSTRAINT ON (p:Product) ASSERT p.price IS :: FLOAT
```

## Transaction Syntax

```gql
BEGIN [TRANSACTION]
[ISOLATION LEVEL {SERIALIZABLE|READ COMMITTED|READ UNCOMMITTED}]

COMMIT [TRANSACTION]
ROLLBACK [TRANSACTION]

SAVEPOINT savepoint_name
ROLLBACK TO SAVEPOINT savepoint_name
```

## Grammar Summary

```
query:
    single_query
  | query UNION [ALL] single_query
  ;

single_query:
    clause+
  ;

clause:
    MATCH pattern [WHERE condition]
  | OPTIONAL MATCH pattern [WHERE condition]
  | CREATE pattern
  | MERGE pattern [ON CREATE SET ...] [ON MATCH SET ...]
  | DELETE expression
  | SET assignment
  | REMOVE removal
  | RETURN return_items [ORDER BY ...] [LIMIT ...] [OFFSET ...]
  | WITH with_items [WHERE condition] [ORDER BY ...] [LIMIT ...]
  ;

pattern:
    pattern_element [, pattern_element]*
  ;

pattern_element:
    node_pattern
  | node_pattern relationship_pattern node_pattern
  | path_variable = pattern_path
  ;

node_pattern:
    '(' [variable] [label_expression] [properties] [WHERE condition] ')'
  ;

relationship_pattern:
    '-[' [variable] [type_expression] [properties] [variable_length] [WHERE condition] ']->'
  | '<-[' [variable] [type_expression] [properties] [variable_length] [WHERE condition] ']-'
  | '-[' [variable] [type_expression] [properties] [variable_length] [WHERE condition] ']-'
  ;
```

## Best Practices

1. **Consistent Formatting**: Use consistent indentation and spacing
2. **Meaningful Names**: Choose descriptive variable names
3. **Quote Special Characters**: Use backticks for identifiers with special characters
4. **Parameterize Queries**: Use parameters instead of string concatenation
5. **Comment Complex Queries**: Add comments explaining business logic
6. **Break Long Queries**: Use WITH to create logical query stages
7. **Validate Syntax**: Test queries incrementally while building

## Related Topics

- **GQL Reference**: Complete language reference
- **GQL Operators**: Operator documentation
- **GQL Functions**: Function reference
- **Data Types**: Type system
- **Query Optimization**: Performance tuning

## Further Reading

- [GQL Reference](/tags/gql-reference/) - Complete language documentation
- [GQL Operators](/tags/operators/) - Operator reference
- [Built-in Functions](/tags/functions/) - Function catalog
- [Data Types](/tags/types/) - Type system
- [Query Performance](/tags/performance/) - Optimization guide

This syntax guide provides the complete grammatical reference for writing correct GQL queries in Geode, from basic patterns to advanced language features.
