---
title: "JSON Data Type & Functions"
description: "Comprehensive guide to JSON support in Geode graph database. Learn about JSON data types, storage, querying, indexing, functions, and integration with GQL for flexible semi-structured data handling."
keywords:
  - JSON data type
  - JSON functions
  - JSON queries
  - JSON indexing
  - semi-structured data
  - JSON storage
  - JSON path
  - Geode
  - graph database
  - GQL JSON
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/json/"
    noindex: false
---

JSON (JavaScript Object Notation) is the universal format for semi-structured data in modern applications. Geode provides first-class JSON support as a native data type, enabling you to store, query, index, and manipulate JSON documents alongside graph data. This integration allows flexible schema evolution, hierarchical data storage, and seamless interoperability with web services and APIs.

As an ISO/IEC 39075:2024 GQL-compliant graph database, Geode treats JSON as a fundamental data type with rich operator support, specialized functions, and optimized storage. Whether you're storing user preferences, configuration data, API responses, or complex nested structures, Geode's JSON capabilities provide the flexibility and performance your applications need.

## JSON Data Type

Geode's JSON type supports the full JSON specification including objects, arrays, strings, numbers, booleans, and null values:

```gql
-- Create nodes with JSON properties
CREATE (u:User {
  name: 'Alice',
  preferences: '{"theme": "dark", "language": "en", "notifications": true}',
  tags: '["developer", "database", "graph"]',
  metadata: '{"created": "2024-01-24T10:00:00Z", "source": "api"}'
});

-- JSON values are automatically parsed and validated
CREATE (p:Product {
  name: 'Laptop',
  specs: {
    cpu: 'Intel i7',
    ram: 16,
    storage: {type: 'SSD', capacity: 512}
  }
});
```

**Supported JSON Values**:

- **Objects**: `{"key": "value", "nested": {"data": true}}`
- **Arrays**: `[1, 2, 3, "four", {"five": 5}]`
- **Strings**: `"text value"`
- **Numbers**: `42`, `3.14`, `-10.5`, `1.23e10`
- **Booleans**: `true`, `false`
- **Null**: `null`

## Storing and Retrieving JSON

**Direct Property Storage**:

```gql
-- Store JSON object
CREATE (doc:Document {
  title: 'API Response',
  data: {
    status: 'success',
    results: [
      {id: 1, value: 'first'},
      {id: 2, value: 'second'}
    ],
    metadata: {
      timestamp: '2024-01-24T10:00:00Z',
      version: '2.0'
    }
  }
});

-- Retrieve JSON property
MATCH (doc:Document {title: 'API Response'})
RETURN doc.data;
```

**JSON String Conversion**:

```gql
-- Parse JSON string to object
MATCH (u:User)
RETURN u.name, JSON_PARSE(u.preferences) AS prefs;

-- Convert object to JSON string
MATCH (p:Product)
RETURN p.name, JSON_STRINGIFY(p.specs) AS specs_json;
```

## Querying JSON Data

**Path Expressions**:

Geode supports JSON path syntax for accessing nested values:

```gql
-- Access nested properties using dot notation
MATCH (u:User)
WHERE u.preferences.theme = 'dark'
RETURN u.name, u.preferences.language;

-- Access array elements by index
MATCH (u:User)
WHERE u.tags[0] = 'developer'
RETURN u.name, u.tags;

-- Deeply nested access
MATCH (p:Product)
WHERE p.specs.storage.type = 'SSD'
RETURN p.name, p.specs.storage.capacity;
```

**JSON Path Functions**:

```gql
-- Extract value using JSON path
MATCH (doc:Document)
RETURN JSON_EXTRACT(doc.data, '$.results[0].value') AS first_value;

-- Check if path exists
MATCH (u:User)
WHERE JSON_EXISTS(u.preferences, '$.notifications')
RETURN u.name;

-- Get multiple values
MATCH (doc:Document)
RETURN JSON_QUERY(doc.data, '$.results[*].id') AS all_ids;
```

**JSON Path Syntax**:

- `$` - Root object
- `.property` - Object member access
- `[index]` - Array element access
- `[*]` - All array elements
- `..property` - Recursive descent
- `[start:end]` - Array slice

## JSON Functions

**Manipulation Functions**:

```gql
-- Merge JSON objects
MATCH (u:User)
RETURN u.name,
       JSON_MERGE(u.preferences, '{"newSetting": true}') AS updated_prefs;

-- Add property to JSON object
MATCH (p:Product)
SET p.specs = JSON_SET(p.specs, '$.warranty', '2 years')
RETURN p;

-- Remove property from JSON object
MATCH (u:User)
SET u.preferences = JSON_REMOVE(u.preferences, '$.deprecated_setting')
RETURN u;

-- Insert into JSON array
MATCH (u:User)
SET u.tags = JSON_ARRAY_APPEND(u.tags, 'graph-expert')
RETURN u;
```

**Type Checking**:

```gql
-- Check JSON type
MATCH (u:User)
RETURN u.name,
       JSON_TYPE(u.preferences) AS pref_type,
       JSON_TYPE(u.tags) AS tags_type;

-- Validate JSON structure
MATCH (doc:Document)
WHERE JSON_VALID(doc.data)
RETURN doc;
```

**Array Functions**:

```gql
-- Get array length
MATCH (u:User)
WHERE JSON_LENGTH(u.tags) > 3
RETURN u.name, u.tags;

-- Check array contains value
MATCH (u:User)
WHERE JSON_CONTAINS(u.tags, 'developer')
RETURN u.name;

-- Get array elements as rows
MATCH (doc:Document)
UNWIND JSON_ARRAY_ELEMENTS(doc.data.results) AS result
RETURN result.id, result.value;
```

**Aggregation with JSON**:

```gql
-- Aggregate values into JSON array
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN u.name,
       JSON_AGG(p.name) AS purchased_products;

-- Aggregate into JSON object
MATCH (u:User)
RETURN u.department,
       JSON_OBJECT_AGG(u.name, u.salary) AS salaries
GROUP BY u.department;
```

## Indexing JSON Properties

**Property Indexes on JSON Fields**:

```gql
-- Create index on JSON property path
CREATE INDEX user_theme ON :User(preferences.theme);

-- Create index on nested JSON field
CREATE INDEX product_storage ON :Product(specs.storage.type);

-- Use indexed JSON property in query
MATCH (u:User)
WHERE u.preferences.theme = 'dark'  -- Uses index
RETURN u.name;
```

**Full-Text Indexes on JSON**:

```gql
-- Create full-text index on JSON string values
CREATE FULLTEXT INDEX doc_content ON :Document(data.content);

-- Search within JSON properties
MATCH (doc:Document)
WHERE doc.data.content MATCHES 'graph database'
RETURN doc.title;
```

**Expression Indexes**:

```gql
-- Index computed JSON values
CREATE INDEX user_tag_count ON :User(JSON_LENGTH(tags));

-- Query using indexed expression
MATCH (u:User)
WHERE JSON_LENGTH(u.tags) > 5
RETURN u.name;
```

## JSON Schema Validation

Geode supports JSON Schema validation for ensuring data quality:

```gql
-- Define schema constraint
CREATE CONSTRAINT user_preferences_schema ON :User
ASSERT JSON_SCHEMA(preferences, {
  type: 'object',
  properties: {
    theme: {type: 'string', enum: ['light', 'dark']},
    language: {type: 'string', pattern: '^[a-z]{2}$'},
    notifications: {type: 'boolean'}
  },
  required: ['theme', 'language']
});

-- Invalid data will be rejected
CREATE (u:User {
  name: 'Bob',
  preferences: {theme: 'invalid'}  -- Error: violates schema
});
```

## JSON in Relationships

JSON properties work seamlessly in relationship properties:

```gql
-- Create relationship with JSON metadata
MATCH (u:User {name: 'Alice'}), (p:Product {name: 'Laptop'})
CREATE (u)-[:VIEWED {
  session: {
    timestamp: '2024-01-24T10:00:00Z',
    device: 'mobile',
    location: {city: 'Seattle', country: 'US'}
  }
}]->(p);

-- Query relationships by JSON properties
MATCH (u:User)-[v:VIEWED]->(p:Product)
WHERE v.session.device = 'mobile'
RETURN u.name, p.name, v.session.location.city;
```

## Performance Optimization

**Index Usage**:

```gql
-- Efficient: Uses property index
MATCH (u:User)
WHERE u.preferences.theme = 'dark'
RETURN u;

-- Less efficient: Full scan
MATCH (u:User)
WHERE JSON_EXTRACT(u.preferences, '$.theme') = 'dark'
RETURN u;
```

**Projection Optimization**:

```gql
-- Retrieve only needed JSON fields
MATCH (p:Product)
RETURN p.name, p.specs.cpu, p.specs.ram  -- Partial access

-- Avoid retrieving entire JSON
MATCH (p:Product)
RETURN p.specs  -- Full JSON retrieval
```

**Denormalization Strategy**:

For frequently accessed JSON fields, consider extracting to top-level properties:

```gql
-- Extract commonly queried fields
MATCH (u:User)
SET u.theme = u.preferences.theme,
    u.language = u.preferences.language;

-- Create index on extracted field
CREATE INDEX user_theme_extracted ON :User(theme);
```

## Integration with Client Libraries

**Go Client**:

```go
type UserPreferences struct {
    Theme        string `json:"theme"`
    Language     string `json:"language"`
    Notifications bool   `json:"notifications"`
}

prefs := UserPreferences{
    Theme: "dark",
    Language: "en",
    Notifications: true,
}

prefsJSON, _ := json.Marshal(prefs)

_, err := conn.Execute(
    "CREATE (u:User {name: $name, preferences: $prefs})",
    map[string]interface{}{
        "name": "Alice",
        "prefs": string(prefsJSON),
    },
)
```

**Python Client**:

```python
import json

preferences = {
    "theme": "dark",
    "language": "en",
    "notifications": True
}

await client.execute(
    "CREATE (u:User {name: $name, preferences: $prefs})",
    parameters={
        "name": "Alice",
        "prefs": json.dumps(preferences)
    }
)

# Query returns parsed JSON
result = await client.execute("MATCH (u:User) RETURN u.preferences AS prefs")
prefs = result[0]["prefs"]  # Already parsed as dict
```

**Rust Client**:

```rust
use serde_json::json;

let preferences = json!({
    "theme": "dark",
    "language": "en",
    "notifications": true
});

client.execute(
    "CREATE (u:User {name: $name, preferences: $prefs})",
    params! {
        "name" => "Alice",
        "prefs" => preferences.to_string()
    }
).await?;
```

## Best Practices

1. **Validate JSON Structure**: Use JSON Schema constraints for critical data to ensure consistency.

2. **Index Frequently Queried Paths**: Create indexes on JSON properties used in WHERE clauses and ORDER BY operations.

3. **Avoid Deep Nesting**: Keep JSON hierarchies shallow (3-4 levels max) for better performance and maintainability.

4. **Extract Hot Fields**: Move frequently accessed JSON fields to top-level properties for better index efficiency.

5. **Use Appropriate Types**: Store structured data as JSON only when schema flexibility is needed. Use native types when possible.

6. **Normalize When Appropriate**: Don't use JSON as an excuse to avoid proper graph modeling. Model relationships as edges, not JSON arrays.

## Common Use Cases

**Configuration Storage**:

```gql
CREATE (app:Application {
  name: 'MyApp',
  config: {
    database: {host: 'localhost', port: 3141},
    cache: {ttl: 3600, max_size: 1000},
    features: {new_ui: true, beta_features: false}
  }
});
```

**Event Logging**:

```gql
CREATE (event:Event {
  type: 'user_action',
  timestamp: '2024-01-24T10:00:00Z',
  payload: {
    action: 'login',
    user_id: 12345,
    device: {type: 'mobile', os: 'iOS'},
    location: {lat: 47.6062, lon: -122.3321}
  }
});
```

**API Response Caching**:

```gql
CREATE (cache:APICache {
  endpoint: '/api/users',
  response: {
    status: 200,
    data: [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}],
    meta: {total: 2, page: 1}
  },
  expires_at: '2024-01-24T11:00:00Z'
});
```

## Related Topics

- Data Types and Type System
- Property Indexing Strategies
- Query Optimization
- Schema Design and Constraints
- Text Processing and Unicode
- Data Import and Export
- Client Library Integration

## Further Reading

- JSON Functions Reference
- JSON Path Syntax Guide
- JSON Schema Validation
- Performance Tuning for JSON Queries
- Semi-Structured Data Modeling
- JSON Import/Export Formats
