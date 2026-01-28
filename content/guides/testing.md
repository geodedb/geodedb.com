---
title: "Testing Strategies Guide"
description: "Comprehensive guide to testing Geode applications with unit tests, integration tests, and performance testing"
weight: 40
tags: ["testing", "unit-tests", "integration-tests", "testcontainers", "ci-cd"]
categories: ["guides", "development"]
keywords:
  - Geode testing
  - graph database testing
  - unit testing GQL
  - integration testing
  - testcontainers
  - test isolation
  - performance testing
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Testing Strategies Guide

Building reliable applications with Geode requires a comprehensive testing strategy. This guide covers unit testing, integration testing, test data management, and CI/CD integration across all supported languages.

## Testing Philosophy

### The Testing Pyramid

```
        /\
       /  \      E2E Tests
      /----\     (few, slow, expensive)
     /      \
    /--------\   Integration Tests
   /          \  (some, moderate)
  /------------\
 /              \ Unit Tests
/----------------\ (many, fast, cheap)
```

**For Geode applications:**
- **Unit Tests**: Test query building, data transformation, validation logic
- **Integration Tests**: Test against real Geode instance (use testcontainers)
- **E2E Tests**: Test full application workflows with real data

### Key Principles

1. **Test isolation**: Each test should run independently
2. **Fast feedback**: Unit tests should run in milliseconds
3. **Realistic data**: Integration tests should use representative data
4. **Clean state**: Reset database between test runs
5. **Deterministic**: Tests should produce consistent results

## Unit Testing Graph Queries

Unit tests verify query construction and data transformation without a database connection.

### Testing Query Builders

{{< tabs >}}
{{< tab "Go" >}}
```go
package queries_test

import (
    "testing"
    "github.com/stretchr/testify/assert"
    "myapp/queries"
)

func TestBuildPersonQuery(t *testing.T) {
    tests := []struct {
        name     string
        filters  queries.PersonFilters
        expected string
    }{
        {
            name:     "query by name",
            filters:  queries.PersonFilters{Name: "Alice"},
            expected: "MATCH (p:Person {name: $name}) RETURN p",
        },
        {
            name:     "query by age range",
            filters:  queries.PersonFilters{MinAge: 18, MaxAge: 65},
            expected: "MATCH (p:Person) WHERE p.age >= $min_age AND p.age <= $max_age RETURN p",
        },
        {
            name:     "query with relationships",
            filters:  queries.PersonFilters{HasFriends: true},
            expected: "MATCH (p:Person)-[:KNOWS]->() RETURN DISTINCT p",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            query := queries.BuildPersonQuery(tt.filters)
            assert.Equal(t, tt.expected, query)
        })
    }
}

func TestBuildRelationshipQuery(t *testing.T) {
    query := queries.BuildRelationshipQuery("KNOWS", 2)
    expected := "MATCH (a)-[:KNOWS*1..2]->(b) RETURN a, b"
    assert.Equal(t, expected, query)
}

// Test parameter validation
func TestQueryParameters(t *testing.T) {
    params := queries.NewParams()
    params.Add("name", "Alice")
    params.Add("age", 30)

    assert.Equal(t, "Alice", params.Get("name"))
    assert.Equal(t, 30, params.Get("age"))
    assert.Nil(t, params.Get("unknown"))
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import pytest
from myapp.queries import QueryBuilder, PersonFilters

class TestQueryBuilder:
    def test_build_person_query_by_name(self):
        filters = PersonFilters(name="Alice")
        query = QueryBuilder.build_person_query(filters)
        assert query == "MATCH (p:Person {name: $name}) RETURN p"

    def test_build_person_query_by_age_range(self):
        filters = PersonFilters(min_age=18, max_age=65)
        query = QueryBuilder.build_person_query(filters)
        expected = "MATCH (p:Person) WHERE p.age >= $min_age AND p.age <= $max_age RETURN p"
        assert query == expected

    def test_build_person_query_with_relationships(self):
        filters = PersonFilters(has_friends=True)
        query = QueryBuilder.build_person_query(filters)
        assert query == "MATCH (p:Person)-[:KNOWS]->() RETURN DISTINCT p"

    @pytest.mark.parametrize("depth,expected", [
        (1, "MATCH (a)-[:KNOWS*1..1]->(b) RETURN a, b"),
        (2, "MATCH (a)-[:KNOWS*1..2]->(b) RETURN a, b"),
        (5, "MATCH (a)-[:KNOWS*1..5]->(b) RETURN a, b"),
    ])
    def test_build_relationship_query_depth(self, depth, expected):
        query = QueryBuilder.build_relationship_query("KNOWS", depth)
        assert query == expected


class TestQueryParameters:
    def test_add_and_get_parameters(self):
        params = QueryBuilder.new_params()
        params.add("name", "Alice")
        params.add("age", 30)

        assert params.get("name") == "Alice"
        assert params.get("age") == 30
        assert params.get("unknown") is None

    def test_parameter_type_validation(self):
        params = QueryBuilder.new_params()

        # Valid types
        params.add("string_val", "test")
        params.add("int_val", 42)
        params.add("float_val", 3.14)
        params.add("bool_val", True)
        params.add("list_val", [1, 2, 3])

        # Invalid type should raise
        with pytest.raises(TypeError):
            params.add("invalid", object())
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::queries::{QueryBuilder, PersonFilters};

    #[test]
    fn test_build_person_query_by_name() {
        let filters = PersonFilters {
            name: Some("Alice".to_string()),
            ..Default::default()
        };
        let query = QueryBuilder::build_person_query(&filters);
        assert_eq!(query, "MATCH (p:Person {name: $name}) RETURN p");
    }

    #[test]
    fn test_build_person_query_by_age_range() {
        let filters = PersonFilters {
            min_age: Some(18),
            max_age: Some(65),
            ..Default::default()
        };
        let query = QueryBuilder::build_person_query(&filters);
        let expected = "MATCH (p:Person) WHERE p.age >= $min_age AND p.age <= $max_age RETURN p";
        assert_eq!(query, expected);
    }

    #[test]
    fn test_build_person_query_with_relationships() {
        let filters = PersonFilters {
            has_friends: true,
            ..Default::default()
        };
        let query = QueryBuilder::build_person_query(&filters);
        assert_eq!(query, "MATCH (p:Person)-[:KNOWS]->() RETURN DISTINCT p");
    }

    #[test]
    fn test_build_relationship_query_depths() {
        let test_cases = vec![
            (1, "MATCH (a)-[:KNOWS*1..1]->(b) RETURN a, b"),
            (2, "MATCH (a)-[:KNOWS*1..2]->(b) RETURN a, b"),
            (5, "MATCH (a)-[:KNOWS*1..5]->(b) RETURN a, b"),
        ];

        for (depth, expected) in test_cases {
            let query = QueryBuilder::build_relationship_query("KNOWS", depth);
            assert_eq!(query, expected);
        }
    }

    #[test]
    fn test_query_parameters() {
        let mut params = QueryBuilder::new_params();
        params.add("name", Value::String("Alice".to_string()));
        params.add("age", Value::Int(30));

        assert_eq!(params.get("name"), Some(&Value::String("Alice".to_string())));
        assert_eq!(params.get("age"), Some(&Value::Int(30)));
        assert_eq!(params.get("unknown"), None);
    }
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
import { describe, it, expect } from 'vitest';
import { QueryBuilder, PersonFilters } from './queries';

describe('QueryBuilder', () => {
    describe('buildPersonQuery', () => {
        it('should build query by name', () => {
            const filters: PersonFilters = { name: 'Alice' };
            const query = QueryBuilder.buildPersonQuery(filters);
            expect(query).toBe('MATCH (p:Person {name: $name}) RETURN p');
        });

        it('should build query by age range', () => {
            const filters: PersonFilters = { minAge: 18, maxAge: 65 };
            const query = QueryBuilder.buildPersonQuery(filters);
            expect(query).toBe(
                'MATCH (p:Person) WHERE p.age >= $min_age AND p.age <= $max_age RETURN p'
            );
        });

        it('should build query with relationships', () => {
            const filters: PersonFilters = { hasFriends: true };
            const query = QueryBuilder.buildPersonQuery(filters);
            expect(query).toBe('MATCH (p:Person)-[:KNOWS]->() RETURN DISTINCT p');
        });
    });

    describe('buildRelationshipQuery', () => {
        it.each([
            [1, 'MATCH (a)-[:KNOWS*1..1]->(b) RETURN a, b'],
            [2, 'MATCH (a)-[:KNOWS*1..2]->(b) RETURN a, b'],
            [5, 'MATCH (a)-[:KNOWS*1..5]->(b) RETURN a, b'],
        ])('should build query with depth %i', (depth, expected) => {
            const query = QueryBuilder.buildRelationshipQuery('KNOWS', depth);
            expect(query).toBe(expected);
        });
    });

    describe('QueryParameters', () => {
        it('should add and get parameters', () => {
            const params = QueryBuilder.newParams();
            params.add('name', 'Alice');
            params.add('age', 30);

            expect(params.get('name')).toBe('Alice');
            expect(params.get('age')).toBe(30);
            expect(params.get('unknown')).toBeUndefined();
        });

        it('should validate parameter types', () => {
            const params = QueryBuilder.newParams();

            // Valid types
            expect(() => params.add('string', 'test')).not.toThrow();
            expect(() => params.add('number', 42)).not.toThrow();
            expect(() => params.add('boolean', true)).not.toThrow();
            expect(() => params.add('array', [1, 2, 3])).not.toThrow();

            // Invalid type
            expect(() => params.add('invalid', Symbol())).toThrow(TypeError);
        });
    });
});
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const std = @import("std");
const testing = std.testing;
const queries = @import("queries.zig");
const QueryBuilder = queries.QueryBuilder;
const PersonFilters = queries.PersonFilters;

test "build person query by name" {
    const filters = PersonFilters{ .name = "Alice" };
    const query = QueryBuilder.buildPersonQuery(filters);
    try testing.expectEqualStrings(
        "MATCH (p:Person {name: $name}) RETURN p",
        query,
    );
}

test "build person query by age range" {
    const filters = PersonFilters{ .min_age = 18, .max_age = 65 };
    const query = QueryBuilder.buildPersonQuery(filters);
    try testing.expectEqualStrings(
        "MATCH (p:Person) WHERE p.age >= $min_age AND p.age <= $max_age RETURN p",
        query,
    );
}

test "build person query with relationships" {
    const filters = PersonFilters{ .has_friends = true };
    const query = QueryBuilder.buildPersonQuery(filters);
    try testing.expectEqualStrings(
        "MATCH (p:Person)-[:KNOWS]->() RETURN DISTINCT p",
        query,
    );
}

test "build relationship query with various depths" {
    const test_cases = .{
        .{ 1, "MATCH (a)-[:KNOWS*1..1]->(b) RETURN a, b" },
        .{ 2, "MATCH (a)-[:KNOWS*1..2]->(b) RETURN a, b" },
        .{ 5, "MATCH (a)-[:KNOWS*1..5]->(b) RETURN a, b" },
    };

    inline for (test_cases) |case| {
        const depth = case[0];
        const expected = case[1];
        const query = QueryBuilder.buildRelationshipQuery("KNOWS", depth);
        try testing.expectEqualStrings(expected, query);
    }
}

test "query parameters add and get" {
    var allocator = testing.allocator;
    var params = QueryBuilder.newParams(allocator);
    defer params.deinit();

    try params.add("name", .{ .string = "Alice" });
    try params.add("age", .{ .integer = 30 });

    try testing.expectEqualStrings("Alice", params.get("name").?.string);
    try testing.expectEqual(@as(i64, 30), params.get("age").?.integer);
    try testing.expect(params.get("unknown") == null);
}
```
{{< /tab >}}
{{< /tabs >}}

### Testing Data Transformation

{{< tabs >}}
{{< tab "Go" >}}
```go
func TestTransformPersonResult(t *testing.T) {
    // Simulate Geode result structure
    rawResult := map[string]interface{}{
        "p.name": "Alice",
        "p.age":  30,
        "p.city": "New York",
    }

    person, err := transform.PersonFromResult(rawResult)
    assert.NoError(t, err)
    assert.Equal(t, "Alice", person.Name)
    assert.Equal(t, 30, person.Age)
    assert.Equal(t, "New York", person.City)
}

func TestTransformPersonResultMissingField(t *testing.T) {
    rawResult := map[string]interface{}{
        "p.name": "Alice",
        // Missing age and city
    }

    _, err := transform.PersonFromResult(rawResult)
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "missing required field")
}

func TestTransformRelationshipResult(t *testing.T) {
    rawResult := map[string]interface{}{
        "r.type":  "KNOWS",
        "r.since": 2020,
        "from":    "Alice",
        "to":      "Bob",
    }

    rel, err := transform.RelationshipFromResult(rawResult)
    assert.NoError(t, err)
    assert.Equal(t, "KNOWS", rel.Type)
    assert.Equal(t, 2020, rel.Since)
    assert.Equal(t, "Alice", rel.From)
    assert.Equal(t, "Bob", rel.To)
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import pytest
from myapp.transform import PersonTransformer, RelationshipTransformer
from myapp.models import Person, Relationship

class TestPersonTransformer:
    def test_transform_person_result(self):
        raw_result = {
            "p.name": "Alice",
            "p.age": 30,
            "p.city": "New York"
        }

        person = PersonTransformer.from_result(raw_result)
        assert person.name == "Alice"
        assert person.age == 30
        assert person.city == "New York"

    def test_transform_person_result_missing_field(self):
        raw_result = {
            "p.name": "Alice",
            # Missing age and city
        }

        with pytest.raises(ValueError, match="missing required field"):
            PersonTransformer.from_result(raw_result)

    def test_transform_person_result_null_values(self):
        raw_result = {
            "p.name": "Alice",
            "p.age": 30,
            "p.city": None  # Optional field can be null
        }

        person = PersonTransformer.from_result(raw_result)
        assert person.name == "Alice"
        assert person.city is None


class TestRelationshipTransformer:
    def test_transform_relationship_result(self):
        raw_result = {
            "r.type": "KNOWS",
            "r.since": 2020,
            "from": "Alice",
            "to": "Bob"
        }

        rel = RelationshipTransformer.from_result(raw_result)
        assert rel.type == "KNOWS"
        assert rel.since == 2020
        assert rel.from_node == "Alice"
        assert rel.to_node == "Bob"
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
#[cfg(test)]
mod transform_tests {
    use super::*;
    use crate::transform::{PersonTransformer, RelationshipTransformer};
    use std::collections::HashMap;

    #[test]
    fn test_transform_person_result() {
        let mut raw_result = HashMap::new();
        raw_result.insert("p.name".to_string(), Value::String("Alice".to_string()));
        raw_result.insert("p.age".to_string(), Value::Int(30));
        raw_result.insert("p.city".to_string(), Value::String("New York".to_string()));

        let person = PersonTransformer::from_result(&raw_result).unwrap();
        assert_eq!(person.name, "Alice");
        assert_eq!(person.age, 30);
        assert_eq!(person.city, Some("New York".to_string()));
    }

    #[test]
    fn test_transform_person_result_missing_field() {
        let mut raw_result = HashMap::new();
        raw_result.insert("p.name".to_string(), Value::String("Alice".to_string()));
        // Missing age and city

        let result = PersonTransformer::from_result(&raw_result);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("missing required field"));
    }

    #[test]
    fn test_transform_relationship_result() {
        let mut raw_result = HashMap::new();
        raw_result.insert("r.type".to_string(), Value::String("KNOWS".to_string()));
        raw_result.insert("r.since".to_string(), Value::Int(2020));
        raw_result.insert("from".to_string(), Value::String("Alice".to_string()));
        raw_result.insert("to".to_string(), Value::String("Bob".to_string()));

        let rel = RelationshipTransformer::from_result(&raw_result).unwrap();
        assert_eq!(rel.rel_type, "KNOWS");
        assert_eq!(rel.since, Some(2020));
        assert_eq!(rel.from, "Alice");
        assert_eq!(rel.to, "Bob");
    }
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
import { describe, it, expect } from 'vitest';
import { PersonTransformer, RelationshipTransformer } from './transform';

describe('PersonTransformer', () => {
    it('should transform person result', () => {
        const rawResult = {
            'p.name': 'Alice',
            'p.age': 30,
            'p.city': 'New York',
        };

        const person = PersonTransformer.fromResult(rawResult);
        expect(person.name).toBe('Alice');
        expect(person.age).toBe(30);
        expect(person.city).toBe('New York');
    });

    it('should throw on missing required field', () => {
        const rawResult = {
            'p.name': 'Alice',
            // Missing age and city
        };

        expect(() => PersonTransformer.fromResult(rawResult)).toThrow(
            'missing required field'
        );
    });

    it('should handle null optional values', () => {
        const rawResult = {
            'p.name': 'Alice',
            'p.age': 30,
            'p.city': null,
        };

        const person = PersonTransformer.fromResult(rawResult);
        expect(person.city).toBeNull();
    });
});

describe('RelationshipTransformer', () => {
    it('should transform relationship result', () => {
        const rawResult = {
            'r.type': 'KNOWS',
            'r.since': 2020,
            from: 'Alice',
            to: 'Bob',
        };

        const rel = RelationshipTransformer.fromResult(rawResult);
        expect(rel.type).toBe('KNOWS');
        expect(rel.since).toBe(2020);
        expect(rel.from).toBe('Alice');
        expect(rel.to).toBe('Bob');
    });
});
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const std = @import("std");
const testing = std.testing;
const transform = @import("transform.zig");

test "transform person result" {
    var allocator = testing.allocator;

    var raw_result = std.StringHashMap(transform.Value).init(allocator);
    defer raw_result.deinit();

    try raw_result.put("p.name", .{ .string = "Alice" });
    try raw_result.put("p.age", .{ .integer = 30 });
    try raw_result.put("p.city", .{ .string = "New York" });

    const person = try transform.PersonTransformer.fromResult(allocator, &raw_result);
    defer allocator.free(person.name);

    try testing.expectEqualStrings("Alice", person.name);
    try testing.expectEqual(@as(i64, 30), person.age);
    try testing.expectEqualStrings("New York", person.city.?);
}

test "transform person result missing field" {
    var allocator = testing.allocator;

    var raw_result = std.StringHashMap(transform.Value).init(allocator);
    defer raw_result.deinit();

    try raw_result.put("p.name", .{ .string = "Alice" });
    // Missing age and city

    const result = transform.PersonTransformer.fromResult(allocator, &raw_result);
    try testing.expectError(error.MissingRequiredField, result);
}

test "transform relationship result" {
    var allocator = testing.allocator;

    var raw_result = std.StringHashMap(transform.Value).init(allocator);
    defer raw_result.deinit();

    try raw_result.put("r.type", .{ .string = "KNOWS" });
    try raw_result.put("r.since", .{ .integer = 2020 });
    try raw_result.put("from", .{ .string = "Alice" });
    try raw_result.put("to", .{ .string = "Bob" });

    const rel = try transform.RelationshipTransformer.fromResult(allocator, &raw_result);

    try testing.expectEqualStrings("KNOWS", rel.rel_type);
    try testing.expectEqual(@as(i64, 2020), rel.since.?);
    try testing.expectEqualStrings("Alice", rel.from);
    try testing.expectEqualStrings("Bob", rel.to);
}
```
{{< /tab >}}
{{< /tabs >}}

## Integration Testing with Testcontainers

Integration tests run against a real Geode instance using testcontainers for isolation.

### Setting Up Testcontainers

{{< tabs >}}
{{< tab "Go" >}}
```go
package integration_test

import (
    "context"
    "database/sql"
    "testing"
    "time"

    "github.com/stretchr/testify/suite"
    "github.com/testcontainers/testcontainers-go"
    "github.com/testcontainers/testcontainers-go/wait"
    _ "geodedb.com/geode"
)

type GeodeTestSuite struct {
    suite.Suite
    container testcontainers.Container
    db        *sql.DB
    ctx       context.Context
}

func (s *GeodeTestSuite) SetupSuite() {
    s.ctx = context.Background()

    req := testcontainers.ContainerRequest{
        Image:        "geodedb/geode:latest",
        ExposedPorts: []string{"3141/tcp"},
        Cmd:          []string{"serve", "--listen", "0.0.0.0:3141"},
        WaitingFor:   wait.ForLog("Server listening").WithStartupTimeout(60 * time.Second),
    }

    container, err := testcontainers.GenericContainer(s.ctx, testcontainers.GenericContainerRequest{
        ContainerRequest: req,
        Started:          true,
    })
    s.Require().NoError(err)
    s.container = container

    host, err := container.Host(s.ctx)
    s.Require().NoError(err)
    port, err := container.MappedPort(s.ctx, "3141")
    s.Require().NoError(err)

    dsn := fmt.Sprintf("%s:%s", host, port.Port())
    s.db, err = sql.Open("geode", dsn)
    s.Require().NoError(err)
}

func (s *GeodeTestSuite) TearDownSuite() {
    if s.db != nil {
        s.db.Close()
    }
    if s.container != nil {
        s.container.Terminate(s.ctx)
    }
}

func (s *GeodeTestSuite) SetupTest() {
    // Clean database before each test
    _, err := s.db.ExecContext(s.ctx, "MATCH (n) DETACH DELETE n")
    s.Require().NoError(err)
}

func (s *GeodeTestSuite) TestCreateAndQueryPerson() {
    // Create person
    _, err := s.db.ExecContext(s.ctx,
        "CREATE (:Person {name: ?, age: ?})", "Alice", 30)
    s.Require().NoError(err)

    // Query person
    rows, err := s.db.QueryContext(s.ctx,
        "MATCH (p:Person {name: ?}) RETURN p.name, p.age", "Alice")
    s.Require().NoError(err)
    defer rows.Close()

    s.True(rows.Next())
    var name string
    var age int
    err = rows.Scan(&name, &age)
    s.Require().NoError(err)
    s.Equal("Alice", name)
    s.Equal(30, age)
}

func (s *GeodeTestSuite) TestCreateRelationship() {
    // Create nodes
    _, err := s.db.ExecContext(s.ctx,
        "CREATE (:Person {name: ?})", "Alice")
    s.Require().NoError(err)
    _, err = s.db.ExecContext(s.ctx,
        "CREATE (:Person {name: ?})", "Bob")
    s.Require().NoError(err)

    // Create relationship
    _, err = s.db.ExecContext(s.ctx, `
        MATCH (a:Person {name: ?}), (b:Person {name: ?})
        CREATE (a)-[:KNOWS {since: ?}]->(b)
    `, "Alice", "Bob", 2020)
    s.Require().NoError(err)

    // Verify relationship
    rows, err := s.db.QueryContext(s.ctx, `
        MATCH (a:Person)-[r:KNOWS]->(b:Person)
        RETURN a.name, b.name, r.since
    `)
    s.Require().NoError(err)
    defer rows.Close()

    s.True(rows.Next())
    var from, to string
    var since int
    err = rows.Scan(&from, &to, &since)
    s.Require().NoError(err)
    s.Equal("Alice", from)
    s.Equal("Bob", to)
    s.Equal(2020, since)
}

func TestGeodeSuite(t *testing.T) {
    suite.Run(t, new(GeodeTestSuite))
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import pytest
import asyncio
from testcontainers.core.container import DockerContainer
from testcontainers.core.waiting_utils import wait_for_logs
from geode_client import Client

class GeodeContainer(DockerContainer):
    def __init__(self):
        super().__init__("geodedb/geode:latest")
        self.with_exposed_ports(3141)
        self.with_command("serve --listen 0.0.0.0:3141")

    def get_connection_url(self) -> tuple[str, int]:
        host = self.get_container_host_ip()
        port = int(self.get_exposed_port(3141))
        return host, port

@pytest.fixture(scope="session")
def geode_container():
    """Start Geode container for the test session."""
    container = GeodeContainer()
    container.start()
    wait_for_logs(container, "Server listening", timeout=60)
    yield container
    container.stop()

@pytest.fixture
async def geode_client(geode_container):
    """Create a Geode client connected to the test container."""
    host, port = geode_container.get_connection_url()
    client = Client(host=host, port=port, skip_verify=True)
    yield client
    # Cleanup is handled by context manager

@pytest.fixture
async def clean_db(geode_client):
    """Clean database before each test."""
    async with geode_client.connection() as conn:
        await conn.execute("MATCH (n) DETACH DELETE n")
    yield

@pytest.mark.asyncio
class TestGeodeIntegration:
    async def test_create_and_query_person(self, geode_client, clean_db):
        async with geode_client.connection() as conn:
            # Create person
            await conn.execute(
                "CREATE (:Person {name: $name, age: $age})",
                {"name": "Alice", "age": 30}
            )

            # Query person
            page, _ = await conn.query(
                "MATCH (p:Person {name: $name}) RETURN p.name, p.age",
                {"name": "Alice"}
            )

            assert len(page.rows) == 1
            row = page.rows[0]
            assert row["p.name"].as_string == "Alice"
            assert row["p.age"].as_int == 30

    async def test_create_relationship(self, geode_client, clean_db):
        async with geode_client.connection() as conn:
            # Create nodes
            await conn.execute(
                "CREATE (:Person {name: $name})",
                {"name": "Alice"}
            )
            await conn.execute(
                "CREATE (:Person {name: $name})",
                {"name": "Bob"}
            )

            # Create relationship
            await conn.execute("""
                MATCH (a:Person {name: $from}), (b:Person {name: $to})
                CREATE (a)-[:KNOWS {since: $since}]->(b)
            """, {"from": "Alice", "to": "Bob", "since": 2020})

            # Verify relationship
            page, _ = await conn.query("""
                MATCH (a:Person)-[r:KNOWS]->(b:Person)
                RETURN a.name, b.name, r.since
            """)

            assert len(page.rows) == 1
            row = page.rows[0]
            assert row["a.name"].as_string == "Alice"
            assert row["b.name"].as_string == "Bob"
            assert row["r.since"].as_int == 2020

    async def test_transaction_rollback(self, geode_client, clean_db):
        async with geode_client.connection() as conn:
            # Start transaction
            await conn.begin()

            # Create person
            await conn.execute(
                "CREATE (:Person {name: $name})",
                {"name": "Alice"}
            )

            # Rollback
            await conn.rollback()

            # Verify person was not created
            page, _ = await conn.query(
                "MATCH (p:Person {name: $name}) RETURN p",
                {"name": "Alice"}
            )
            assert len(page.rows) == 0
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use geode_client::{Client, Value};
use std::collections::HashMap;
use testcontainers::{clients::Cli, core::WaitFor, GenericImage};

struct GeodeContainer {
    _container: testcontainers::Container<'static, GenericImage>,
    host: String,
    port: u16,
}

impl GeodeContainer {
    async fn new(docker: &'static Cli) -> Self {
        let image = GenericImage::new("geodedb/geode", "latest")
            .with_exposed_port(3141)
            .with_wait_for(WaitFor::message_on_stdout("Server listening"));

        let container = docker.run(image);
        let host = "127.0.0.1".to_string();
        let port = container.get_host_port_ipv4(3141);

        Self {
            _container: container,
            host,
            port,
        }
    }

    fn connection_info(&self) -> (&str, u16) {
        (&self.host, self.port)
    }
}

#[tokio::test]
async fn test_create_and_query_person() {
    let docker = Cli::default();
    let geode = GeodeContainer::new(&docker).await;
    let (host, port) = geode.connection_info();

    let client = Client::new(host, port).skip_verify(true);
    let mut conn = client.connect().await.unwrap();

    // Clean database
    conn.query("MATCH (n) DETACH DELETE n").await.unwrap();

    // Create person
    let mut params = HashMap::new();
    params.insert("name".to_string(), Value::string("Alice"));
    params.insert("age".to_string(), Value::int(30));
    conn.query_with_params(
        "CREATE (:Person {name: $name, age: $age})",
        &params
    ).await.unwrap();

    // Query person
    let mut query_params = HashMap::new();
    query_params.insert("name".to_string(), Value::string("Alice"));
    let (page, _) = conn.query_with_params(
        "MATCH (p:Person {name: $name}) RETURN p.name, p.age",
        &query_params
    ).await.unwrap();

    assert_eq!(page.rows.len(), 1);
    let row = &page.rows[0];
    assert_eq!(row.get("p.name").unwrap().as_string().unwrap(), "Alice");
    assert_eq!(row.get("p.age").unwrap().as_int().unwrap(), 30);
}

#[tokio::test]
async fn test_create_relationship() {
    let docker = Cli::default();
    let geode = GeodeContainer::new(&docker).await;
    let (host, port) = geode.connection_info();

    let client = Client::new(host, port).skip_verify(true);
    let mut conn = client.connect().await.unwrap();

    // Clean database
    conn.query("MATCH (n) DETACH DELETE n").await.unwrap();

    // Create nodes
    let mut params = HashMap::new();
    params.insert("name".to_string(), Value::string("Alice"));
    conn.query_with_params("CREATE (:Person {name: $name})", &params).await.unwrap();

    params.insert("name".to_string(), Value::string("Bob"));
    conn.query_with_params("CREATE (:Person {name: $name})", &params).await.unwrap();

    // Create relationship
    let mut rel_params = HashMap::new();
    rel_params.insert("from".to_string(), Value::string("Alice"));
    rel_params.insert("to".to_string(), Value::string("Bob"));
    rel_params.insert("since".to_string(), Value::int(2020));
    conn.query_with_params(r#"
        MATCH (a:Person {name: $from}), (b:Person {name: $to})
        CREATE (a)-[:KNOWS {since: $since}]->(b)
    "#, &rel_params).await.unwrap();

    // Verify relationship
    let (page, _) = conn.query(r#"
        MATCH (a:Person)-[r:KNOWS]->(b:Person)
        RETURN a.name, b.name, r.since
    "#).await.unwrap();

    assert_eq!(page.rows.len(), 1);
    let row = &page.rows[0];
    assert_eq!(row.get("a.name").unwrap().as_string().unwrap(), "Alice");
    assert_eq!(row.get("b.name").unwrap().as_string().unwrap(), "Bob");
    assert_eq!(row.get("r.since").unwrap().as_int().unwrap(), 2020);
}

#[tokio::test]
async fn test_transaction_rollback() {
    let docker = Cli::default();
    let geode = GeodeContainer::new(&docker).await;
    let (host, port) = geode.connection_info();

    let client = Client::new(host, port).skip_verify(true);
    let mut conn = client.connect().await.unwrap();

    // Clean database
    conn.query("MATCH (n) DETACH DELETE n").await.unwrap();

    // Start transaction
    conn.begin().await.unwrap();

    // Create person
    let mut params = HashMap::new();
    params.insert("name".to_string(), Value::string("Alice"));
    conn.query_with_params("CREATE (:Person {name: $name})", &params).await.unwrap();

    // Rollback
    conn.rollback().await.unwrap();

    // Verify person was not created
    let (page, _) = conn.query_with_params(
        "MATCH (p:Person {name: $name}) RETURN p",
        &params
    ).await.unwrap();
    assert_eq!(page.rows.len(), 0);
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { createClient, GeodeClient } from '@geodedb/client';

describe('Geode Integration Tests', () => {
    let container: StartedTestContainer;
    let client: GeodeClient;

    beforeAll(async () => {
        container = await new GenericContainer('geodedb/geode:latest')
            .withExposedPorts(3141)
            .withCommand(['serve', '--listen', '0.0.0.0:3141'])
            .withWaitStrategy(Wait.forLogMessage('Server listening'))
            .start();

        const host = container.getHost();
        const port = container.getMappedPort(3141);
        client = await createClient(`geode://${host}:${port}`);
    }, 60000);

    afterAll(async () => {
        await client?.close();
        await container?.stop();
    });

    beforeEach(async () => {
        // Clean database before each test
        await client.exec('MATCH (n) DETACH DELETE n');
    });

    it('should create and query person', async () => {
        // Create person
        await client.exec(
            'CREATE (:Person {name: $name, age: $age})',
            { params: { name: 'Alice', age: 30 } }
        );

        // Query person
        const rows = await client.queryAll(
            'MATCH (p:Person {name: $name}) RETURN p.name, p.age',
            { params: { name: 'Alice' } }
        );

        expect(rows.length).toBe(1);
        expect(rows[0].get('p.name')?.asString).toBe('Alice');
        expect(rows[0].get('p.age')?.asNumber).toBe(30);
    });

    it('should create relationship', async () => {
        // Create nodes
        await client.exec('CREATE (:Person {name: $name})', { params: { name: 'Alice' } });
        await client.exec('CREATE (:Person {name: $name})', { params: { name: 'Bob' } });

        // Create relationship
        await client.exec(`
            MATCH (a:Person {name: $from}), (b:Person {name: $to})
            CREATE (a)-[:KNOWS {since: $since}]->(b)
        `, { params: { from: 'Alice', to: 'Bob', since: 2020 } });

        // Verify relationship
        const rows = await client.queryAll(`
            MATCH (a:Person)-[r:KNOWS]->(b:Person)
            RETURN a.name, b.name, r.since
        `);

        expect(rows.length).toBe(1);
        expect(rows[0].get('a.name')?.asString).toBe('Alice');
        expect(rows[0].get('b.name')?.asString).toBe('Bob');
        expect(rows[0].get('r.since')?.asNumber).toBe(2020);
    });

    it('should rollback transaction', async () => {
        await client.withTransaction(async (tx) => {
            // Create person
            await tx.exec('CREATE (:Person {name: $name})', { params: { name: 'Alice' } });

            // Throw to trigger rollback
            throw new Error('Intentional rollback');
        }).catch(() => {});

        // Verify person was not created
        const rows = await client.queryAll(
            'MATCH (p:Person {name: $name}) RETURN p',
            { params: { name: 'Alice' } }
        );
        expect(rows.length).toBe(0);
    });
});
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const std = @import("std");
const testing = std.testing;
const geode = @import("geode_client");

// Note: Zig testcontainers integration requires external process management
// This example shows the test structure with manual container management

const TestContext = struct {
    allocator: std.mem.Allocator,
    client: geode.GeodeClient,

    pub fn init(allocator: std.mem.Allocator, host: []const u8, port: u16) !TestContext {
        var client = geode.GeodeClient.init(allocator, host, port, true);
        try client.connect();
        try client.sendHello("test", "1.0.0");
        _ = try client.receiveMessage(30000);
        return TestContext{
            .allocator = allocator,
            .client = client,
        };
    }

    pub fn deinit(self: *TestContext) void {
        self.client.deinit();
    }

    pub fn cleanDatabase(self: *TestContext) !void {
        try self.client.sendRunGql(1, "MATCH (n) DETACH DELETE n", null);
        _ = try self.client.receiveMessage(30000);
    }
};

test "integration: create and query person" {
    // Assumes Geode is running on localhost:3141 for integration tests
    // In CI, start container before running tests
    var allocator = testing.allocator;
    var ctx = try TestContext.init(allocator, "localhost", 3141);
    defer ctx.deinit();

    try ctx.cleanDatabase();

    // Create person with params
    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();
    try params.put("name", .{ .string = "Alice" });
    try params.put("age", .{ .integer = 30 });

    try ctx.client.sendRunGql(1,
        "CREATE (:Person {name: $name, age: $age})",
        .{ .object = params });
    _ = try ctx.client.receiveMessage(30000);

    // Query person
    params.clearRetainingCapacity();
    try params.put("name", .{ .string = "Alice" });

    try ctx.client.sendRunGql(2,
        "MATCH (p:Person {name: $name}) RETURN p.name, p.age",
        .{ .object = params });
    _ = try ctx.client.receiveMessage(30000);

    try ctx.client.sendPull(2, 1000);
    const result = try ctx.client.receiveMessage(30000);
    defer allocator.free(result);

    // Parse and verify result
    // Result parsing would extract p.name = "Alice" and p.age = 30
    try testing.expect(std.mem.indexOf(u8, result, "Alice") != null);
}

test "integration: create relationship" {
    var allocator = testing.allocator;
    var ctx = try TestContext.init(allocator, "localhost", 3141);
    defer ctx.deinit();

    try ctx.cleanDatabase();

    // Create nodes
    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();

    try params.put("name", .{ .string = "Alice" });
    try ctx.client.sendRunGql(1, "CREATE (:Person {name: $name})", .{ .object = params });
    _ = try ctx.client.receiveMessage(30000);

    params.clearRetainingCapacity();
    try params.put("name", .{ .string = "Bob" });
    try ctx.client.sendRunGql(2, "CREATE (:Person {name: $name})", .{ .object = params });
    _ = try ctx.client.receiveMessage(30000);

    // Create relationship
    params.clearRetainingCapacity();
    try params.put("from", .{ .string = "Alice" });
    try params.put("to", .{ .string = "Bob" });
    try params.put("since", .{ .integer = 2020 });

    try ctx.client.sendRunGql(3,
        \\MATCH (a:Person {name: $from}), (b:Person {name: $to})
        \\CREATE (a)-[:KNOWS {since: $since}]->(b)
    , .{ .object = params });
    _ = try ctx.client.receiveMessage(30000);

    // Verify relationship
    try ctx.client.sendRunGql(4,
        \\MATCH (a:Person)-[r:KNOWS]->(b:Person)
        \\RETURN a.name, b.name, r.since
    , null);
    _ = try ctx.client.receiveMessage(30000);

    try ctx.client.sendPull(4, 1000);
    const result = try ctx.client.receiveMessage(30000);
    defer allocator.free(result);

    try testing.expect(std.mem.indexOf(u8, result, "Alice") != null);
    try testing.expect(std.mem.indexOf(u8, result, "Bob") != null);
}
```
{{< /tab >}}
{{< /tabs >}}

## Test Data Management

### Test Data Factories

Create reusable test data factories to generate consistent test data.

{{< tabs >}}
{{< tab "Go" >}}
```go
package testdata

import (
    "context"
    "database/sql"
    "fmt"
)

type PersonFactory struct {
    db     *sql.DB
    ctx    context.Context
    count  int
}

func NewPersonFactory(db *sql.DB) *PersonFactory {
    return &PersonFactory{
        db:  db,
        ctx: context.Background(),
    }
}

func (f *PersonFactory) Create(name string, age int) (*Person, error) {
    f.count++
    _, err := f.db.ExecContext(f.ctx,
        "CREATE (:Person {id: ?, name: ?, age: ?})",
        f.count, name, age)
    if err != nil {
        return nil, err
    }
    return &Person{ID: f.count, Name: name, Age: age}, nil
}

func (f *PersonFactory) CreateMany(count int) ([]*Person, error) {
    people := make([]*Person, count)
    for i := 0; i < count; i++ {
        person, err := f.Create(
            fmt.Sprintf("Person%d", i+1),
            20 + (i % 50),
        )
        if err != nil {
            return nil, err
        }
        people[i] = person
    }
    return people, nil
}

func (f *PersonFactory) CreateWithFriends(name string, friendCount int) (*Person, []*Person, error) {
    person, err := f.Create(name, 30)
    if err != nil {
        return nil, nil, err
    }

    friends := make([]*Person, friendCount)
    for i := 0; i < friendCount; i++ {
        friend, err := f.Create(fmt.Sprintf("%s_friend_%d", name, i+1), 25+i)
        if err != nil {
            return nil, nil, err
        }
        friends[i] = friend

        // Create relationship
        _, err = f.db.ExecContext(f.ctx, `
            MATCH (a:Person {id: ?}), (b:Person {id: ?})
            CREATE (a)-[:KNOWS]->(b)
        `, person.ID, friend.ID)
        if err != nil {
            return nil, nil, err
        }
    }

    return person, friends, nil
}

// Usage in tests
func TestWithFactories(t *testing.T) {
    factory := NewPersonFactory(db)

    // Create single person
    alice, _ := factory.Create("Alice", 30)

    // Create many people
    people, _ := factory.CreateMany(100)

    // Create person with friends
    bob, friends, _ := factory.CreateWithFriends("Bob", 5)
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
from dataclasses import dataclass
from typing import List, Tuple
import random

@dataclass
class Person:
    id: int
    name: str
    age: int

class PersonFactory:
    def __init__(self, conn):
        self.conn = conn
        self.count = 0

    async def create(self, name: str, age: int) -> Person:
        self.count += 1
        await self.conn.execute(
            "CREATE (:Person {id: $id, name: $name, age: $age})",
            {"id": self.count, "name": name, "age": age}
        )
        return Person(id=self.count, name=name, age=age)

    async def create_many(self, count: int) -> List[Person]:
        people = []
        for i in range(count):
            person = await self.create(
                f"Person{i+1}",
                20 + (i % 50)
            )
            people.append(person)
        return people

    async def create_with_friends(
        self,
        name: str,
        friend_count: int
    ) -> Tuple[Person, List[Person]]:
        person = await self.create(name, 30)

        friends = []
        for i in range(friend_count):
            friend = await self.create(f"{name}_friend_{i+1}", 25 + i)
            friends.append(friend)

            # Create relationship
            await self.conn.execute("""
                MATCH (a:Person {id: $from_id}), (b:Person {id: $to_id})
                CREATE (a)-[:KNOWS]->(b)
            """, {"from_id": person.id, "to_id": friend.id})

        return person, friends

    async def create_social_network(self, size: int, avg_connections: int) -> List[Person]:
        """Create a realistic social network for testing."""
        people = await self.create_many(size)

        for person in people:
            # Create random connections
            num_connections = random.randint(1, avg_connections * 2)
            potential_friends = [p for p in people if p.id != person.id]
            friends = random.sample(potential_friends, min(num_connections, len(potential_friends)))

            for friend in friends:
                await self.conn.execute("""
                    MATCH (a:Person {id: $from_id}), (b:Person {id: $to_id})
                    MERGE (a)-[:KNOWS]->(b)
                """, {"from_id": person.id, "to_id": friend.id})

        return people


# Usage in tests
@pytest.fixture
async def person_factory(geode_client):
    async with geode_client.connection() as conn:
        yield PersonFactory(conn)


@pytest.mark.asyncio
async def test_with_factory(person_factory):
    # Create single person
    alice = await person_factory.create("Alice", 30)

    # Create many people
    people = await person_factory.create_many(100)

    # Create person with friends
    bob, friends = await person_factory.create_with_friends("Bob", 5)

    # Create social network
    network = await person_factory.create_social_network(50, 5)
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use geode_client::{Client, Connection, Value};
use std::collections::HashMap;

pub struct Person {
    pub id: i64,
    pub name: String,
    pub age: i64,
}

pub struct PersonFactory<'a> {
    conn: &'a mut Connection,
    count: i64,
}

impl<'a> PersonFactory<'a> {
    pub fn new(conn: &'a mut Connection) -> Self {
        Self { conn, count: 0 }
    }

    pub async fn create(&mut self, name: &str, age: i64) -> Result<Person, Box<dyn std::error::Error>> {
        self.count += 1;
        let mut params = HashMap::new();
        params.insert("id".to_string(), Value::int(self.count));
        params.insert("name".to_string(), Value::string(name));
        params.insert("age".to_string(), Value::int(age));

        self.conn.query_with_params(
            "CREATE (:Person {id: $id, name: $name, age: $age})",
            &params
        ).await?;

        Ok(Person {
            id: self.count,
            name: name.to_string(),
            age,
        })
    }

    pub async fn create_many(&mut self, count: usize) -> Result<Vec<Person>, Box<dyn std::error::Error>> {
        let mut people = Vec::with_capacity(count);
        for i in 0..count {
            let person = self.create(
                &format!("Person{}", i + 1),
                20 + (i as i64 % 50),
            ).await?;
            people.push(person);
        }
        Ok(people)
    }

    pub async fn create_with_friends(
        &mut self,
        name: &str,
        friend_count: usize
    ) -> Result<(Person, Vec<Person>), Box<dyn std::error::Error>> {
        let person = self.create(name, 30).await?;

        let mut friends = Vec::with_capacity(friend_count);
        for i in 0..friend_count {
            let friend = self.create(
                &format!("{}_friend_{}", name, i + 1),
                25 + i as i64
            ).await?;

            // Create relationship
            let mut rel_params = HashMap::new();
            rel_params.insert("from_id".to_string(), Value::int(person.id));
            rel_params.insert("to_id".to_string(), Value::int(friend.id));

            self.conn.query_with_params(r#"
                MATCH (a:Person {id: $from_id}), (b:Person {id: $to_id})
                CREATE (a)-[:KNOWS]->(b)
            "#, &rel_params).await?;

            friends.push(friend);
        }

        Ok((person, friends))
    }
}

// Usage in tests
#[tokio::test]
async fn test_with_factory() {
    let client = Client::new("127.0.0.1", 3141).skip_verify(true);
    let mut conn = client.connect().await.unwrap();

    let mut factory = PersonFactory::new(&mut conn);

    // Create single person
    let alice = factory.create("Alice", 30).await.unwrap();

    // Create many people
    let people = factory.create_many(100).await.unwrap();

    // Create person with friends
    let (bob, friends) = factory.create_with_friends("Bob", 5).await.unwrap();
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
interface Person {
    id: number;
    name: string;
    age: number;
}

class PersonFactory {
    private count = 0;

    constructor(private client: GeodeClient) {}

    async create(name: string, age: number): Promise<Person> {
        this.count++;
        await this.client.exec(
            'CREATE (:Person {id: $id, name: $name, age: $age})',
            { params: { id: this.count, name, age } }
        );
        return { id: this.count, name, age };
    }

    async createMany(count: number): Promise<Person[]> {
        const people: Person[] = [];
        for (let i = 0; i < count; i++) {
            const person = await this.create(
                `Person${i + 1}`,
                20 + (i % 50)
            );
            people.push(person);
        }
        return people;
    }

    async createWithFriends(
        name: string,
        friendCount: number
    ): Promise<[Person, Person[]]> {
        const person = await this.create(name, 30);

        const friends: Person[] = [];
        for (let i = 0; i < friendCount; i++) {
            const friend = await this.create(`${name}_friend_${i + 1}`, 25 + i);
            friends.push(friend);

            // Create relationship
            await this.client.exec(`
                MATCH (a:Person {id: $fromId}), (b:Person {id: $toId})
                CREATE (a)-[:KNOWS]->(b)
            `, { params: { fromId: person.id, toId: friend.id } });
        }

        return [person, friends];
    }

    async createSocialNetwork(size: number, avgConnections: number): Promise<Person[]> {
        const people = await this.createMany(size);

        for (const person of people) {
            const numConnections = Math.floor(Math.random() * avgConnections * 2) + 1;
            const potentialFriends = people.filter(p => p.id !== person.id);
            const friends = potentialFriends
                .sort(() => Math.random() - 0.5)
                .slice(0, Math.min(numConnections, potentialFriends.length));

            for (const friend of friends) {
                await this.client.exec(`
                    MATCH (a:Person {id: $fromId}), (b:Person {id: $toId})
                    MERGE (a)-[:KNOWS]->(b)
                `, { params: { fromId: person.id, toId: friend.id } });
            }
        }

        return people;
    }
}

// Usage in tests
describe('Tests with Factory', () => {
    let factory: PersonFactory;

    beforeEach(() => {
        factory = new PersonFactory(client);
    });

    it('should create single person', async () => {
        const alice = await factory.create('Alice', 30);
        expect(alice.name).toBe('Alice');
    });

    it('should create many people', async () => {
        const people = await factory.createMany(100);
        expect(people.length).toBe(100);
    });

    it('should create person with friends', async () => {
        const [bob, friends] = await factory.createWithFriends('Bob', 5);
        expect(friends.length).toBe(5);
    });
});
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const std = @import("std");
const geode = @import("geode_client");

pub const Person = struct {
    id: i64,
    name: []const u8,
    age: i64,
};

pub const PersonFactory = struct {
    allocator: std.mem.Allocator,
    client: *geode.GeodeClient,
    count: i64,

    pub fn init(allocator: std.mem.Allocator, client: *geode.GeodeClient) PersonFactory {
        return PersonFactory{
            .allocator = allocator,
            .client = client,
            .count = 0,
        };
    }

    pub fn create(self: *PersonFactory, name: []const u8, age: i64) !Person {
        self.count += 1;

        var params = std.json.ObjectMap.init(self.allocator);
        defer params.deinit();
        try params.put("id", .{ .integer = self.count });
        try params.put("name", .{ .string = name });
        try params.put("age", .{ .integer = age });

        try self.client.sendRunGql(
            @intCast(self.count),
            "CREATE (:Person {id: $id, name: $name, age: $age})",
            .{ .object = params },
        );
        _ = try self.client.receiveMessage(30000);

        return Person{
            .id = self.count,
            .name = name,
            .age = age,
        };
    }

    pub fn createMany(self: *PersonFactory, count: usize) ![]Person {
        var people = try self.allocator.alloc(Person, count);

        for (0..count) |i| {
            const name = try std.fmt.allocPrint(self.allocator, "Person{d}", .{i + 1});
            people[i] = try self.create(name, 20 + @as(i64, @intCast(i % 50)));
        }

        return people;
    }

    pub fn createWithFriends(
        self: *PersonFactory,
        name: []const u8,
        friend_count: usize,
    ) !struct { person: Person, friends: []Person } {
        const person = try self.create(name, 30);

        var friends = try self.allocator.alloc(Person, friend_count);

        for (0..friend_count) |i| {
            const friend_name = try std.fmt.allocPrint(
                self.allocator,
                "{s}_friend_{d}",
                .{ name, i + 1 },
            );
            friends[i] = try self.create(friend_name, 25 + @as(i64, @intCast(i)));

            // Create relationship
            var rel_params = std.json.ObjectMap.init(self.allocator);
            defer rel_params.deinit();
            try rel_params.put("from_id", .{ .integer = person.id });
            try rel_params.put("to_id", .{ .integer = friends[i].id });

            try self.client.sendRunGql(
                @intCast(self.count + 1000 + @as(i64, @intCast(i))),
                \\MATCH (a:Person {id: $from_id}), (b:Person {id: $to_id})
                \\CREATE (a)-[:KNOWS]->(b)
            ,
                .{ .object = rel_params },
            );
            _ = try self.client.receiveMessage(30000);
        }

        return .{ .person = person, .friends = friends };
    }
};

// Usage in tests
test "factory creates people" {
    var allocator = std.testing.allocator;
    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();

    try client.connect();

    var factory = PersonFactory.init(allocator, &client);

    // Create single person
    const alice = try factory.create("Alice", 30);
    try std.testing.expectEqual(@as(i64, 30), alice.age);

    // Create many people
    const people = try factory.createMany(10);
    defer allocator.free(people);
    try std.testing.expectEqual(@as(usize, 10), people.len);
}
```
{{< /tab >}}
{{< /tabs >}}

### Test Data Fixtures

Load predefined test data from files or constants.

```gql
// fixtures/social_network.gql
// Small social network for testing

// Users
CREATE (:User {id: 1, name: "Alice", email: "alice@example.com"})
CREATE (:User {id: 2, name: "Bob", email: "bob@example.com"})
CREATE (:User {id: 3, name: "Charlie", email: "charlie@example.com"})
CREATE (:User {id: 4, name: "Diana", email: "diana@example.com"})
CREATE (:User {id: 5, name: "Eve", email: "eve@example.com"})

// Friendships
MATCH (a:User {id: 1}), (b:User {id: 2}) CREATE (a)-[:FRIENDS]->(b)
MATCH (a:User {id: 1}), (b:User {id: 3}) CREATE (a)-[:FRIENDS]->(b)
MATCH (a:User {id: 2}), (b:User {id: 3}) CREATE (a)-[:FRIENDS]->(b)
MATCH (a:User {id: 2}), (b:User {id: 4}) CREATE (a)-[:FRIENDS]->(b)
MATCH (a:User {id: 3}), (b:User {id: 5}) CREATE (a)-[:FRIENDS]->(b)

// Posts
CREATE (:Post {id: 1, content: "Hello World!", author_id: 1, created_at: timestamp()})
CREATE (:Post {id: 2, content: "Graph databases are awesome!", author_id: 2, created_at: timestamp()})

// Connect posts to authors
MATCH (u:User {id: 1}), (p:Post {id: 1}) CREATE (u)-[:POSTED]->(p)
MATCH (u:User {id: 2}), (p:Post {id: 2}) CREATE (u)-[:POSTED]->(p)
```

## Mocking vs Real Database Testing

### When to Mock

**Mock when:**
- Testing query building logic (no database needed)
- Testing error handling paths
- Testing rate limiting or circuit breaker behavior
- Unit testing business logic that uses query results

**Use real database when:**
- Testing actual query execution
- Verifying data integrity
- Testing transaction behavior
- Performance testing

### Mock Client Example

{{< tabs >}}
{{< tab "Go" >}}
```go
// Define interface for mocking
type GeodeClient interface {
    Query(ctx context.Context, query string, params ...interface{}) (*Result, error)
    Exec(ctx context.Context, query string, params ...interface{}) error
}

// Mock implementation
type MockGeodeClient struct {
    QueryFunc func(ctx context.Context, query string, params ...interface{}) (*Result, error)
    ExecFunc  func(ctx context.Context, query string, params ...interface{}) error
}

func (m *MockGeodeClient) Query(ctx context.Context, query string, params ...interface{}) (*Result, error) {
    if m.QueryFunc != nil {
        return m.QueryFunc(ctx, query, params...)
    }
    return &Result{}, nil
}

func (m *MockGeodeClient) Exec(ctx context.Context, query string, params ...interface{}) error {
    if m.ExecFunc != nil {
        return m.ExecFunc(ctx, query, params...)
    }
    return nil
}

// Test with mock
func TestGetUserFriends(t *testing.T) {
    mock := &MockGeodeClient{
        QueryFunc: func(ctx context.Context, query string, params ...interface{}) (*Result, error) {
            // Verify correct query
            assert.Contains(t, query, "MATCH")
            assert.Contains(t, query, "[:FRIENDS]")

            // Return mock data
            return &Result{
                Rows: []map[string]interface{}{
                    {"name": "Bob"},
                    {"name": "Charlie"},
                },
            }, nil
        },
    }

    service := NewUserService(mock)
    friends, err := service.GetFriends(context.Background(), "Alice")

    assert.NoError(t, err)
    assert.Len(t, friends, 2)
    assert.Equal(t, "Bob", friends[0].Name)
}

// Test error handling with mock
func TestGetUserFriendsError(t *testing.T) {
    mock := &MockGeodeClient{
        QueryFunc: func(ctx context.Context, query string, params ...interface{}) (*Result, error) {
            return nil, errors.New("connection refused")
        },
    }

    service := NewUserService(mock)
    _, err := service.GetFriends(context.Background(), "Alice")

    assert.Error(t, err)
    assert.Contains(t, err.Error(), "connection refused")
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
from unittest.mock import AsyncMock, MagicMock
import pytest

class MockConnection:
    def __init__(self):
        self.query = AsyncMock()
        self.execute = AsyncMock()

class MockClient:
    def __init__(self):
        self._connection = MockConnection()

    def connection(self):
        return MockContextManager(self._connection)

class MockContextManager:
    def __init__(self, conn):
        self.conn = conn

    async def __aenter__(self):
        return self.conn

    async def __aexit__(self, *args):
        pass


@pytest.fixture
def mock_client():
    return MockClient()


@pytest.mark.asyncio
async def test_get_user_friends(mock_client):
    # Setup mock response
    mock_result = MagicMock()
    mock_result.rows = [
        {"name": MagicMock(as_string="Bob")},
        {"name": MagicMock(as_string="Charlie")},
    ]
    mock_client._connection.query.return_value = (mock_result, None)

    # Test service
    service = UserService(mock_client)
    friends = await service.get_friends("Alice")

    # Verify
    assert len(friends) == 2
    assert friends[0].name == "Bob"
    assert friends[1].name == "Charlie"

    # Verify query was called correctly
    mock_client._connection.query.assert_called_once()
    call_args = mock_client._connection.query.call_args
    assert "MATCH" in call_args[0][0]
    assert "[:FRIENDS]" in call_args[0][0]


@pytest.mark.asyncio
async def test_get_user_friends_error(mock_client):
    # Setup mock to raise error
    mock_client._connection.query.side_effect = ConnectionError("connection refused")

    service = UserService(mock_client)

    with pytest.raises(ConnectionError, match="connection refused"):
        await service.get_friends("Alice")
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use async_trait::async_trait;
use std::collections::HashMap;

// Define trait for mocking
#[async_trait]
pub trait GeodeClient: Send + Sync {
    async fn query(&self, query: &str) -> Result<Page, Error>;
    async fn query_with_params(
        &self,
        query: &str,
        params: &HashMap<String, Value>
    ) -> Result<Page, Error>;
}

// Mock implementation
pub struct MockGeodeClient {
    pub query_response: Option<Page>,
    pub query_error: Option<Error>,
}

#[async_trait]
impl GeodeClient for MockGeodeClient {
    async fn query(&self, _query: &str) -> Result<Page, Error> {
        if let Some(err) = &self.query_error {
            return Err(err.clone());
        }
        Ok(self.query_response.clone().unwrap_or_default())
    }

    async fn query_with_params(
        &self,
        _query: &str,
        _params: &HashMap<String, Value>
    ) -> Result<Page, Error> {
        if let Some(err) = &self.query_error {
            return Err(err.clone());
        }
        Ok(self.query_response.clone().unwrap_or_default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_user_friends() {
        let mock = MockGeodeClient {
            query_response: Some(Page {
                rows: vec![
                    Row::from([("name".to_string(), Value::String("Bob".to_string()))]),
                    Row::from([("name".to_string(), Value::String("Charlie".to_string()))]),
                ],
            }),
            query_error: None,
        };

        let service = UserService::new(Box::new(mock));
        let friends = service.get_friends("Alice").await.unwrap();

        assert_eq!(friends.len(), 2);
        assert_eq!(friends[0].name, "Bob");
        assert_eq!(friends[1].name, "Charlie");
    }

    #[tokio::test]
    async fn test_get_user_friends_error() {
        let mock = MockGeodeClient {
            query_response: None,
            query_error: Some(Error::ConnectionRefused),
        };

        let service = UserService::new(Box::new(mock));
        let result = service.get_friends("Alice").await;

        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), Error::ConnectionRefused));
    }
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
import { describe, it, expect, vi } from 'vitest';

// Mock client
const createMockClient = () => ({
    queryAll: vi.fn(),
    exec: vi.fn(),
    close: vi.fn(),
});

describe('UserService', () => {
    it('should get user friends', async () => {
        const mockClient = createMockClient();
        mockClient.queryAll.mockResolvedValue([
            { get: (key: string) => ({ asString: 'Bob' }) },
            { get: (key: string) => ({ asString: 'Charlie' }) },
        ]);

        const service = new UserService(mockClient as any);
        const friends = await service.getFriends('Alice');

        expect(friends.length).toBe(2);
        expect(friends[0].name).toBe('Bob');
        expect(friends[1].name).toBe('Charlie');

        // Verify query
        expect(mockClient.queryAll).toHaveBeenCalledTimes(1);
        const [query] = mockClient.queryAll.mock.calls[0];
        expect(query).toContain('MATCH');
        expect(query).toContain('[:FRIENDS]');
    });

    it('should handle connection error', async () => {
        const mockClient = createMockClient();
        mockClient.queryAll.mockRejectedValue(new Error('connection refused'));

        const service = new UserService(mockClient as any);

        await expect(service.getFriends('Alice')).rejects.toThrow('connection refused');
    });
});
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const std = @import("std");
const testing = std.testing;

// Mock client for testing
pub const MockGeodeClient = struct {
    allocator: std.mem.Allocator,
    query_response: ?[]const u8,
    should_error: bool,

    pub fn init(allocator: std.mem.Allocator) MockGeodeClient {
        return MockGeodeClient{
            .allocator = allocator,
            .query_response = null,
            .should_error = false,
        };
    }

    pub fn setResponse(self: *MockGeodeClient, response: []const u8) void {
        self.query_response = response;
    }

    pub fn setError(self: *MockGeodeClient) void {
        self.should_error = true;
    }

    pub fn sendRunGql(
        self: *MockGeodeClient,
        _: i64,
        _: []const u8,
        _: ?std.json.Value,
    ) !void {
        if (self.should_error) {
            return error.ConnectionRefused;
        }
    }

    pub fn receiveMessage(self: *MockGeodeClient, _: u64) ![]const u8 {
        if (self.should_error) {
            return error.ConnectionRefused;
        }
        return self.query_response orelse "{}";
    }
};

test "get user friends with mock" {
    var allocator = testing.allocator;
    var mock = MockGeodeClient.init(allocator);

    // Set mock response
    mock.setResponse(
        \\{"rows": [{"name": "Bob"}, {"name": "Charlie"}]}
    );

    // Test service
    var service = UserService.init(&mock);
    const friends = try service.getFriends("Alice");

    try testing.expectEqual(@as(usize, 2), friends.len);
}

test "get user friends error with mock" {
    var allocator = testing.allocator;
    var mock = MockGeodeClient.init(allocator);

    // Set mock to error
    mock.setError();

    var service = UserService.init(&mock);
    const result = service.getFriends("Alice");

    try testing.expectError(error.ConnectionRefused, result);
}
```
{{< /tab >}}
{{< /tabs >}}

## Performance Testing

### Load Testing

Test your application under realistic load conditions.

{{< tabs >}}
{{< tab "Go" >}}
```go
package benchmark_test

import (
    "context"
    "database/sql"
    "sync"
    "testing"
    "time"
)

func BenchmarkQueryPerson(b *testing.B) {
    db, _ := sql.Open("geode", "localhost:3141")
    defer db.Close()
    ctx := context.Background()

    // Setup test data
    db.ExecContext(ctx, "MATCH (n) DETACH DELETE n")
    db.ExecContext(ctx, "CREATE (:Person {name: 'Alice', age: 30})")

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        rows, _ := db.QueryContext(ctx,
            "MATCH (p:Person {name: ?}) RETURN p", "Alice")
        rows.Close()
    }
}

func BenchmarkConcurrentQueries(b *testing.B) {
    db, _ := sql.Open("geode", "localhost:3141")
    defer db.Close()
    ctx := context.Background()

    // Setup test data
    db.ExecContext(ctx, "MATCH (n) DETACH DELETE n")
    for i := 0; i < 100; i++ {
        db.ExecContext(ctx,
            "CREATE (:Person {id: ?, name: ?})", i, fmt.Sprintf("Person%d", i))
    }

    b.ResetTimer()
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            id := rand.Intn(100)
            rows, _ := db.QueryContext(ctx,
                "MATCH (p:Person {id: ?}) RETURN p", id)
            rows.Close()
        }
    })
}

func TestLoadTest(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping load test in short mode")
    }

    db, _ := sql.Open("geode", "localhost:3141")
    defer db.Close()
    ctx := context.Background()

    // Setup
    db.ExecContext(ctx, "MATCH (n) DETACH DELETE n")
    for i := 0; i < 1000; i++ {
        db.ExecContext(ctx,
            "CREATE (:Person {id: ?, name: ?})", i, fmt.Sprintf("Person%d", i))
    }

    // Run load test
    concurrency := 50
    duration := 10 * time.Second
    var wg sync.WaitGroup
    var totalQueries int64
    var errors int64

    start := time.Now()
    for i := 0; i < concurrency; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for time.Since(start) < duration {
                id := rand.Intn(1000)
                _, err := db.QueryContext(ctx,
                    "MATCH (p:Person {id: ?}) RETURN p", id)
                if err != nil {
                    atomic.AddInt64(&errors, 1)
                } else {
                    atomic.AddInt64(&totalQueries, 1)
                }
            }
        }()
    }
    wg.Wait()

    elapsed := time.Since(start)
    qps := float64(totalQueries) / elapsed.Seconds()

    t.Logf("Total queries: %d", totalQueries)
    t.Logf("Errors: %d", errors)
    t.Logf("QPS: %.2f", qps)
    t.Logf("Duration: %s", elapsed)

    // Assert minimum performance
    if qps < 1000 {
        t.Errorf("QPS too low: %.2f (expected >= 1000)", qps)
    }
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import pytest
import asyncio
import time
from statistics import mean, stdev

@pytest.mark.asyncio
@pytest.mark.benchmark
async def test_query_performance(geode_client, clean_db):
    """Benchmark single query performance."""
    async with geode_client.connection() as conn:
        # Setup test data
        await conn.execute(
            "CREATE (:Person {name: $name, age: $age})",
            {"name": "Alice", "age": 30}
        )

        # Warm up
        for _ in range(10):
            await conn.query(
                "MATCH (p:Person {name: $name}) RETURN p",
                {"name": "Alice"}
            )

        # Benchmark
        times = []
        for _ in range(100):
            start = time.perf_counter()
            await conn.query(
                "MATCH (p:Person {name: $name}) RETURN p",
                {"name": "Alice"}
            )
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)  # Convert to ms

        avg_ms = mean(times)
        std_ms = stdev(times)
        p99_ms = sorted(times)[98]

        print(f"\nQuery Performance:")
        print(f"  Average: {avg_ms:.2f}ms")
        print(f"  Std Dev: {std_ms:.2f}ms")
        print(f"  P99: {p99_ms:.2f}ms")

        assert avg_ms < 10, f"Average latency too high: {avg_ms:.2f}ms"


@pytest.mark.asyncio
@pytest.mark.benchmark
async def test_concurrent_load(geode_client, clean_db):
    """Test concurrent query performance."""
    async with geode_client.connection() as conn:
        # Setup test data
        for i in range(1000):
            await conn.execute(
                "CREATE (:Person {id: $id, name: $name})",
                {"id": i, "name": f"Person{i}"}
            )

    async def worker(client, duration_seconds: int) -> tuple[int, int]:
        """Run queries for specified duration."""
        queries = 0
        errors = 0
        start = time.time()

        while time.time() - start < duration_seconds:
            try:
                async with client.connection() as conn:
                    person_id = queries % 1000
                    await conn.query(
                        "MATCH (p:Person {id: $id}) RETURN p",
                        {"id": person_id}
                    )
                    queries += 1
            except Exception:
                errors += 1

        return queries, errors

    # Run concurrent workers
    concurrency = 50
    duration = 10

    tasks = [worker(geode_client, duration) for _ in range(concurrency)]
    results = await asyncio.gather(*tasks)

    total_queries = sum(r[0] for r in results)
    total_errors = sum(r[1] for r in results)
    qps = total_queries / duration

    print(f"\nLoad Test Results:")
    print(f"  Concurrency: {concurrency}")
    print(f"  Duration: {duration}s")
    print(f"  Total Queries: {total_queries}")
    print(f"  Errors: {total_errors}")
    print(f"  QPS: {qps:.2f}")

    assert qps > 1000, f"QPS too low: {qps:.2f}"
    assert total_errors / total_queries < 0.01, "Error rate too high"
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use geode_client::{Client, Value};
use std::collections::HashMap;
use tokio::runtime::Runtime;

fn query_benchmark(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    // Setup
    rt.block_on(async {
        let client = Client::new("127.0.0.1", 3141).skip_verify(true);
        let mut conn = client.connect().await.unwrap();

        conn.query("MATCH (n) DETACH DELETE n").await.unwrap();

        let mut params = HashMap::new();
        params.insert("name".to_string(), Value::string("Alice"));
        params.insert("age".to_string(), Value::int(30));
        conn.query_with_params(
            "CREATE (:Person {name: $name, age: $age})",
            &params
        ).await.unwrap();
    });

    c.bench_function("simple_query", |b| {
        b.to_async(&rt).iter(|| async {
            let client = Client::new("127.0.0.1", 3141).skip_verify(true);
            let mut conn = client.connect().await.unwrap();

            let mut params = HashMap::new();
            params.insert("name".to_string(), Value::string("Alice"));
            let (page, _) = conn.query_with_params(
                "MATCH (p:Person {name: $name}) RETURN p",
                &params
            ).await.unwrap();

            black_box(page)
        });
    });
}

fn concurrent_query_benchmark(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    // Setup with more data
    rt.block_on(async {
        let client = Client::new("127.0.0.1", 3141).skip_verify(true);
        let mut conn = client.connect().await.unwrap();

        conn.query("MATCH (n) DETACH DELETE n").await.unwrap();

        for i in 0..100 {
            let mut params = HashMap::new();
            params.insert("id".to_string(), Value::int(i));
            params.insert("name".to_string(), Value::string(&format!("Person{}", i)));
            conn.query_with_params(
                "CREATE (:Person {id: $id, name: $name})",
                &params
            ).await.unwrap();
        }
    });

    let mut group = c.benchmark_group("concurrent_queries");

    for concurrency in [1, 10, 50, 100].iter() {
        group.bench_with_input(
            BenchmarkId::new("concurrency", concurrency),
            concurrency,
            |b, &concurrency| {
                b.to_async(&rt).iter(|| async move {
                    let mut handles = Vec::new();

                    for _ in 0..concurrency {
                        handles.push(tokio::spawn(async move {
                            let client = Client::new("127.0.0.1", 3141).skip_verify(true);
                            let mut conn = client.connect().await.unwrap();

                            let id = rand::random::<i64>() % 100;
                            let mut params = HashMap::new();
                            params.insert("id".to_string(), Value::int(id));

                            conn.query_with_params(
                                "MATCH (p:Person {id: $id}) RETURN p",
                                &params
                            ).await.unwrap()
                        }));
                    }

                    for handle in handles {
                        black_box(handle.await.unwrap());
                    }
                });
            },
        );
    }

    group.finish();
}

criterion_group!(benches, query_benchmark, concurrent_query_benchmark);
criterion_main!(benches);
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, GeodeClient } from '@geodedb/client';

describe('Performance Tests', () => {
    let client: GeodeClient;

    beforeAll(async () => {
        client = await createClient('geode://localhost:3141');
        await client.exec('MATCH (n) DETACH DELETE n');
    });

    afterAll(async () => {
        await client?.close();
    });

    it('should benchmark single query performance', async () => {
        // Setup
        await client.exec(
            'CREATE (:Person {name: $name, age: $age})',
            { params: { name: 'Alice', age: 30 } }
        );

        // Warm up
        for (let i = 0; i < 10; i++) {
            await client.queryAll(
                'MATCH (p:Person {name: $name}) RETURN p',
                { params: { name: 'Alice' } }
            );
        }

        // Benchmark
        const times: number[] = [];
        for (let i = 0; i < 100; i++) {
            const start = performance.now();
            await client.queryAll(
                'MATCH (p:Person {name: $name}) RETURN p',
                { params: { name: 'Alice' } }
            );
            times.push(performance.now() - start);
        }

        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const sorted = [...times].sort((a, b) => a - b);
        const p99 = sorted[98];

        console.log(`\nQuery Performance:`);
        console.log(`  Average: ${avg.toFixed(2)}ms`);
        console.log(`  P99: ${p99.toFixed(2)}ms`);

        expect(avg).toBeLessThan(10);
    });

    it('should handle concurrent load', async () => {
        // Setup
        for (let i = 0; i < 1000; i++) {
            await client.exec(
                'CREATE (:Person {id: $id, name: $name})',
                { params: { id: i, name: `Person${i}` } }
            );
        }

        const concurrency = 50;
        const duration = 10000; // 10 seconds

        const worker = async (): Promise<{ queries: number; errors: number }> => {
            let queries = 0;
            let errors = 0;
            const start = Date.now();

            while (Date.now() - start < duration) {
                try {
                    await client.queryAll(
                        'MATCH (p:Person {id: $id}) RETURN p',
                        { params: { id: queries % 1000 } }
                    );
                    queries++;
                } catch {
                    errors++;
                }
            }

            return { queries, errors };
        };

        const results = await Promise.all(
            Array(concurrency).fill(null).map(() => worker())
        );

        const totalQueries = results.reduce((sum, r) => sum + r.queries, 0);
        const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
        const qps = totalQueries / (duration / 1000);

        console.log(`\nLoad Test Results:`);
        console.log(`  Concurrency: ${concurrency}`);
        console.log(`  Total Queries: ${totalQueries}`);
        console.log(`  Errors: ${totalErrors}`);
        console.log(`  QPS: ${qps.toFixed(2)}`);

        expect(qps).toBeGreaterThan(1000);
    }, 60000);
});
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Setup
    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();
    try client.connect();
    try client.sendHello("benchmark", "1.0.0");
    _ = try client.receiveMessage(30000);

    // Clean and setup data
    try client.sendRunGql(1, "MATCH (n) DETACH DELETE n", null);
    _ = try client.receiveMessage(30000);

    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();
    try params.put("name", .{ .string = "Alice" });
    try params.put("age", .{ .integer = 30 });

    try client.sendRunGql(2, "CREATE (:Person {name: $name, age: $age})", .{ .object = params });
    _ = try client.receiveMessage(30000);

    // Benchmark
    const iterations: usize = 1000;
    var times = try allocator.alloc(i64, iterations);
    defer allocator.free(times);

    for (0..iterations) |i| {
        const start = std.time.nanoTimestamp();

        params.clearRetainingCapacity();
        try params.put("name", .{ .string = "Alice" });

        try client.sendRunGql(@intCast(i + 100),
            "MATCH (p:Person {name: $name}) RETURN p",
            .{ .object = params });
        _ = try client.receiveMessage(30000);

        times[i] = std.time.nanoTimestamp() - start;
    }

    // Calculate statistics
    var sum: i128 = 0;
    for (times) |t| {
        sum += t;
    }
    const avg_ns = @divTrunc(sum, iterations);
    const avg_ms = @as(f64, @floatFromInt(avg_ns)) / 1_000_000.0;

    // Sort for percentiles
    std.mem.sort(i64, times, {}, std.sort.asc(i64));
    const p99_ns = times[@divTrunc(iterations * 99, 100)];
    const p99_ms = @as(f64, @floatFromInt(p99_ns)) / 1_000_000.0;

    std.debug.print("\nBenchmark Results:\n", .{});
    std.debug.print("  Iterations: {d}\n", .{iterations});
    std.debug.print("  Average: {d:.2}ms\n", .{avg_ms});
    std.debug.print("  P99: {d:.2}ms\n", .{p99_ms});
}
```
{{< /tab >}}
{{< /tabs >}}

## Test Isolation Strategies

### Database-Level Isolation

```gql
// Clean database between tests
MATCH (n) DETACH DELETE n
```

### Namespace Isolation

Use prefixes or separate graphs for test isolation:

```gql
// Each test uses a unique prefix
CREATE (:test_123_Person {name: "Alice"})

// Cleanup specific test data
MATCH (n) WHERE labels(n)[0] STARTS WITH "test_123_"
DETACH DELETE n
```

### Transaction-Based Isolation

```python
@pytest.fixture
async def isolated_transaction(geode_client):
    """Run each test in a transaction that gets rolled back."""
    async with geode_client.connection() as conn:
        await conn.begin()
        yield conn
        await conn.rollback()  # Always rollback, even on success
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      geode:
        image: geodedb/geode:latest
        ports:
          - 3141:3141
        options: >-
          --health-cmd "geode ping localhost:3141"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.24'

      - name: Run unit tests
        run: go test -v -short ./...

      - name: Run integration tests
        run: go test -v -run Integration ./...
        env:
          GEODE_HOST: localhost
          GEODE_PORT: 3141

      - name: Run benchmarks
        run: go test -v -run Benchmark -bench=. ./...
```

### GitLab CI Example

```yaml
stages:
  - test
  - benchmark

variables:
  GEODE_IMAGE: geodedb/geode:latest

unit-tests:
  stage: test
  script:
    - go test -v -short ./...

integration-tests:
  stage: test
  services:
    - name: $GEODE_IMAGE
      alias: geode
      command: ["serve", "--listen", "0.0.0.0:3141"]
  variables:
    GEODE_HOST: geode
    GEODE_PORT: 3141
  script:
    - go test -v -run Integration ./...

performance-tests:
  stage: benchmark
  services:
    - name: $GEODE_IMAGE
      alias: geode
      command: ["serve", "--listen", "0.0.0.0:3141"]
  script:
    - go test -v -run Benchmark -bench=. ./... | tee benchmark.txt
  artifacts:
    paths:
      - benchmark.txt
```

## Best Practices Summary

### Do

- Write unit tests for query builders and data transformations
- Use testcontainers for integration tests
- Clean database state between tests
- Use test data factories for consistent data
- Test error handling paths
- Include performance tests in CI
- Use meaningful test names

### Avoid

- Testing against shared database instances
- Hardcoding test data in tests
- Skipping error handling tests
- Running performance tests on every commit
- Testing implementation details instead of behavior

## Resources

- [Integration Testing Guide](/guides/integration-testing/)
- [Error Handling Guide](/guides/error-handling/)
- [Performance Guide](/docs/performance/)
- [Client Libraries](/clients/)

---

**Questions?** Discuss testing strategies in our [forum](https://forum.geodedb.com).
