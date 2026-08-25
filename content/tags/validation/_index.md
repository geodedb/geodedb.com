---
title: "Data Validation"
description: "Multi-layer data validation strategies in Geode including schema constraints, application validation, and business rule enforcement"
keywords: ["data validation", "input validation", "validation rules", "business rules", "data integrity", "validation constraints", "schema validation", "CHECK constraints", "sanitization", "security"]
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Data Validation

Data validation is the process of ensuring that data conforms to defined rules, formats, and business requirements before it enters or is updated in your Geode graph database. Effective validation prevents data quality issues, maintains referential integrity, and enforces domain-specific constraints across your graph. Geode supports multi-layer validation from database schema constraints to application-level validation logic.

## Why Multi-Layer Validation Matters

Relying solely on application-level validation is risky—bugs, API changes, or direct database access can bypass these checks. Conversely, database-only validation can be too rigid for complex business rules. A layered approach provides defense in depth:

1. **Schema Layer**: Type checking, NOT NULL, UNIQUE, CHECK constraints
2. **Database Layer**: Custom validation functions, triggers, complex business rules
3. **Application Layer**: User experience, async validation, cross-system checks
4. **Client Layer**: Immediate feedback, format validation, UX optimization

## Schema-Level Validation

Schema constraints provide the first and most critical validation layer. These constraints are enforced by Geode at the storage engine level.

### Type and Format Validation

```gql
-- Basic type and format validation
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
CREATE GRAPH TYPE PersonType AS {
  email STRING,
  age INTEGER,
  phone STRING,  -- E.164 format
  ssn STRING,  -- US SSN format
  postal_code STRING  -- US ZIP
};

-- SKU and product code patterns
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
CREATE GRAPH TYPE ProductType AS {
  sku STRING,  -- Format: AB-123456
  upc STRING,  -- UPC-A barcode
  price DECIMAL,
  weight_kg DECIMAL
};

-- URL and domain validation
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
CREATE GRAPH TYPE WebsiteType AS {
  url STRING,
  domain STRING
};
```

### Range and Enumeration Validation

```gql
-- Numeric ranges
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
CREATE GRAPH TYPE BookingType AS {
  guests INTEGER,
  nights INTEGER,
  room_number INTEGER
};

-- Enumerated values
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
CREATE GRAPH TYPE OrderType AS {
  status STRING,
  priority STRING,
  payment_method STRING
};

-- Percentage constraints
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
CREATE GRAPH TYPE DiscountType AS {
  percentage DECIMAL,
  min_order_value DECIMAL
};
```

### Cross-Property Validation

```gql
-- Date range validation
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
-- Not supported in a field definition: CONSTRAINT, NOT NULL — enforce with CREATE CONSTRAINT or at write time.
CREATE GRAPH TYPE EventType AS {
  registration_start DATE,
  registration_end DATE,
  event_start DATE,
  event_end DATE
};

-- Conditional requirements
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
-- Not supported in a field definition: CONSTRAINT — enforce with CREATE CONSTRAINT or at write time.
CREATE GRAPH TYPE EmployeeType AS {
  employment_type STRING,
  annual_salary DECIMAL,
  hourly_rate DECIMAL,
  benefits_eligible BOOLEAN
};

-- Price consistency
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
-- Not supported in a field definition: CONSTRAINT, NOT NULL — enforce with CREATE CONSTRAINT or at write time.
CREATE GRAPH TYPE ProductType AS {
  base_price DECIMAL,
  sale_price DECIMAL,
  cost DECIMAL
};
```

## Custom Validation Functions

Create reusable validation logic as database functions:

```gql
-- Email validation function
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Phone number validation (international)
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Credit card validation (Luhn algorithm)
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Use in schema constraints
-- Geode has no ALTER LABEL / ALTER GRAPH / property DEFAULT DDL. Labels and
-- properties are schema-free: write the new property with SET, supplying the
-- default yourself.
MATCH (u:User) WHERE u.verified IS NULL SET u.verified = false;

-- Geode has no ALTER LABEL / ALTER GRAPH / property DEFAULT DDL. Labels and
-- properties are schema-free: write the new property with SET, supplying the
-- default yourself.
MATCH (u:User) WHERE u.verified IS NULL SET u.verified = false;
```

## Application-Level Validation

Application-layer validation provides richer error messages, async checks, and user experience optimization.

### Python Validation with Marshmallow

```python
from marshmallow import Schema, fields, validates, validates_schema, ValidationError
from geode_client import Client
import re

class PersonSchema(Schema):
    email = fields.Email(required=True)
    age = fields.Integer(required=True)
    name = fields.String(required=True, validate=lambda n: len(n) >= 2)
    phone = fields.String(allow_none=True)
    password = fields.String(required=True, load_only=True)

    @validates('age')
    def validate_age(self, value):
        if value < 0 or value > 150:
            raise ValidationError("Age must be between 0 and 150")

    @validates('phone')
    def validate_phone(self, value):
        if value and not re.match(r'^\+?[1-9]\d{1,14}$', value):
            raise ValidationError("Invalid phone number format")

    @validates('password')
    def validate_password(self, value):
        if len(value) < 8:
            raise ValidationError("Password must be at least 8 characters")
        if not re.search(r'[A-Z]', value):
            raise ValidationError("Password must contain uppercase letter")
        if not re.search(r'[0-9]', value):
            raise ValidationError("Password must contain number")

    @validates_schema
    def validate_business_rules(self, data, **kwargs):
        # Cross-field validation
        if data.get('age', 0) < 18 and data.get('email', '').endswith('.edu'):
            raise ValidationError("Users under 18 cannot use .edu emails")


async def create_person(client: Client, person_data: dict):
    """Create person with validation."""
    schema = PersonSchema()

    try:
        # Validate input data
        validated = schema.load(person_data)
    except ValidationError as err:
        return {"success": False, "errors": err.messages}

    # Check uniqueness (async validation)
    exists, _ = await client.query(
        "MATCH (p:Person {email: $email}) RETURN count(p) AS count",
        {"email": validated['email']}
    )

    if exists.bindings[0]['count'] > 0:
        return {"success": False, "errors": {"email": ["Email already exists"]}}

    # Insert validated data
    try:
        result, _ = await client.query(
            """INSERT (p:Person {
                email: $email,
                name: $name,
                age: $age,
                phone: $phone
            }) RETURN p""",
            validated
        )
        return {"success": True, "person": result.bindings[0]['p']}

    except Exception as e:
        return {"success": False, "errors": {"database": [str(e)]}}
```

### Go Validation with Validator Library

```go
package main

import (
    "context"
    "fmt"
    "github.com/go-playground/validator/v10"
    "geodedb.com/geode"
)

type Person struct {
    Email    string `validate:"required,email,max=255"`
    Age      int    `validate:"required,min=0,max=150"`
    Name     string `validate:"required,min=2,max=100"`
    Phone    string `validate:"omitempty,e164"`  // E.164 phone format
    Password string `validate:"required,min=8,containsany=ABCDEFGHIJKLMNOPQRSTUVWXYZ,containsany=0123456789"`
}

func CreatePerson(ctx context.Context, db *geode.DB, p *Person) error {
    // Validate struct
    validate := validator.New()
    if err := validate.Struct(p); err != nil {
        validationErrs := err.(validator.ValidationErrors)
        return fmt.Errorf("validation failed: %v", validationErrs)
    }

    // Check uniqueness
    var count int
    err := db.QueryRowContext(ctx,
        "MATCH (p:Person {email: $1}) RETURN count(p)",
        p.Email).Scan(&count)

    if err != nil {
        return fmt.Errorf("uniqueness check failed: %w", err)
    }

    if count > 0 {
        return fmt.Errorf("email already exists: %s", p.Email)
    }

    // Insert person
    _, err = db.ExecContext(ctx,
        `INSERT (p:Person {
            email: $1,
            name: $2,
            age: $3,
            phone: $4
        })`,
        p.Email, p.Name, p.Age, p.Phone)

    return err
}
```

### Rust Validation with Validator Crate

```rust
use validator::{Validate, ValidationError};
use geode_client::{Client, Value};
use std::collections::HashMap;

#[derive(Debug, Validate)]
struct Person {
    #[validate(email, length(max = 255))]
    email: String,

    #[validate(range(min = 0, max = 150))]
    age: i32,

    #[validate(length(min = 2, max = 100))]
    name: String,

    #[validate(phone)]
    phone: Option<String>,

    #[validate(length(min = 8), custom = "validate_password_strength")]
    password: String,
}

fn validate_password_strength(password: &str) -> Result<(), ValidationError> {
    let has_upper = password.chars().any(|c| c.is_uppercase());
    let has_digit = password.chars().any(|c| c.is_numeric());

    if !has_upper || !has_digit {
        return Err(ValidationError::new("password_weak"));
    }

    Ok(())
}

async fn create_person(client: &Client, person: &Person) -> Result<(), Box<dyn std::error::Error>> {
    // Validate
    person.validate()?;

    // Check uniqueness
    let mut params = HashMap::new();
    params.insert("email", Value::String(person.email.clone()));

    let result = client.execute(
        "MATCH (p:Person {email: $email}) RETURN count(p) AS count",
        &params
    ).await?;

    let count = result.bindings[0]["count"].as_i64().unwrap_or(0);
    if count > 0 {
        return Err("Email already exists".into());
    }

    // Insert
    let mut insert_params = HashMap::new();
    insert_params.insert("email", Value::String(person.email.clone()));
    insert_params.insert("name", Value::String(person.name.clone()));
    insert_params.insert("age", Value::Integer(person.age as i64));

    client.execute(
        "INSERT (p:Person {email: $email, name: $name, age: $age})",
        &insert_params
    ).await?;

    Ok(())
}
```

## Input Sanitization and Security

Always sanitize user input to prevent injection attacks and data corruption.

### GQL Injection Prevention

```python
# NEVER construct queries with string concatenation
# BAD - vulnerable to injection
user_email = request.form['email']
query = f"MATCH (p:Person {{email: '{user_email}'}}) RETURN p"  # DANGEROUS!

# GOOD - use parameterized queries
await client.execute(
    "MATCH (p:Person {email: $email}) RETURN p",
    {"email": user_email}
)
```

### XSS Prevention

```python
from html import escape
from bleach import clean

def sanitize_text_input(text: str) -> str:
    """Remove HTML and trim whitespace."""
    return escape(text.strip())

def sanitize_rich_text(html: str) -> str:
    """Allow safe HTML tags only."""
    allowed_tags = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a']
    allowed_attrs = {'a': ['href', 'title']}
    return clean(html, tags=allowed_tags, attributes=allowed_attrs, strip=True)

# Use in application
user_bio = sanitize_rich_text(request.form['bio'])
user_name = sanitize_text_input(request.form['name'])
```

### Path Traversal Prevention

```python
import os
from pathlib import Path

def validate_filename(filename: str) -> str:
    """Ensure filename is safe and doesn't contain path traversal."""
    # Remove directory separators
    safe_name = os.path.basename(filename)

    # Check for suspicious patterns
    if '..' in safe_name or safe_name.startswith('.'):
        raise ValueError("Invalid filename")

    # Limit character set
    if not all(c.isalnum() or c in '.-_' for c in safe_name):
        raise ValueError("Filename contains invalid characters")

    return safe_name
```

## Validation Error Handling

### Structured Error Responses

```python
from dataclasses import dataclass, field
from typing import List, Dict, Any

@dataclass
class ValidationError:
    field: str
    message: str
    code: str
    value: Any = None

@dataclass
class ValidationResult:
    valid: bool = True
    errors: List[ValidationError] = field(default_factory=list)
    warnings: List[ValidationError] = field(default_factory=list)

    def add_error(self, field: str, message: str, code: str = "invalid", value: Any = None):
        self.valid = False
        self.errors.append(ValidationError(field, message, code, value))

    def add_warning(self, field: str, message: str, code: str = "warning"):
        self.warnings.append(ValidationError(field, message, code))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "valid": self.valid,
            "errors": [{"field": e.field, "message": e.message, "code": e.code} for e in self.errors],
            "warnings": [{"field": w.field, "message": w.message, "code": w.code} for w in self.warnings]
        }


async def validate_order(order_data: dict) -> ValidationResult:
    result = ValidationResult()

    # Required fields
    if not order_data.get('customer_id'):
        result.add_error('customer_id', 'Customer ID is required', 'required')

    if not order_data.get('items') or len(order_data['items']) == 0:
        result.add_error('items', 'Order must contain at least one item', 'min_items')

    # Business rules
    total = sum(item['price'] * item['quantity'] for item in order_data.get('items', []))
    if total < 5.00:
        result.add_warning('total', f'Order total ${total:.2f} is below minimum ${5.00}', 'below_minimum')

    return result
```

## Best Practices

1. **Validate Early and Often**: Check data at the earliest possible layer
2. **Use Schema Constraints**: Enforce data types and ranges at the database level
3. **Provide Clear Error Messages**: Users need actionable feedback
4. **Sanitize All Input**: Never trust user-provided data
5. **Use Parameterized Queries**: Prevent injection attacks
6. **Log Validation Failures**: Track patterns of invalid data for improvement
7. **Test Validation Logic**: Write unit tests for all validators
8. **Document Validation Rules**: Maintain a catalog of business rules
9. **Version Validation Rules**: Track changes to validation logic
10. **Balance UX and Security**: Validate strictly but provide helpful guidance

## Common Validation Patterns

**Email Uniqueness**:

```python
async def check_email_unique(email: str) -> bool:
    result, _ = await client.query(
        "MATCH (p:Person {email: $email}) RETURN count(p) AS count",
        {"email": email}
    )
    return result.bindings[0]['count'] == 0
```

**Age Verification**:

```gql
CHECK (AGE(CURRENT_DATE, date_of_birth.year) >= 18)
```

**Stock Availability**:

```gql
CONSTRAINT check_stock CHECK (quantity_ordered <= quantity_available)
```

## Troubleshooting

**Schema constraint too strict**: Consider if the rule belongs in application layer

**Performance issues with complex checks**: Move expensive validation to async background jobs

**Inconsistent validation across clients**: Centralize validation rules in database functions or shared library

**Users bypassing validation**: Ensure all entry points (API, admin tools, imports) use same validation

## Related Topics

- [Constraints](/tags/constraints) - Schema-level constraint enforcement
- [Data Quality](/tags/data-quality) - Overall data quality management
- [Security](/tags/security) - Security best practices
- [Sanitization](/tags/security/) - Input sanitization techniques
- [Transactions](/tags/transactions) - Transactional validation
- [Error Handling](/tags/troubleshooting/) - Handling validation errors
