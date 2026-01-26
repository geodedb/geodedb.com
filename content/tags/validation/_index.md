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
CREATE NODE TYPE Person (
    email STRING CHECK (email LIKE '%@%.%' AND LENGTH(email) <= 255),
    age INTEGER CHECK (age >= 0 AND age <= 150),
    phone STRING CHECK (phone ~ '^\+?[0-9]{10,15}$'),  -- E.164 format
    ssn STRING CHECK (ssn ~ '^\d{3}-\d{2}-\d{4}$'),    -- US SSN format
    postal_code STRING CHECK (postal_code ~ '^[0-9]{5}(-[0-9]{4})?$')  -- US ZIP
);

-- SKU and product code patterns
CREATE NODE TYPE Product (
    sku STRING CHECK (sku ~ '^[A-Z]{2,3}-[0-9]{6}$'),  -- Format: AB-123456
    upc STRING CHECK (upc ~ '^\d{12}$'),               -- UPC-A barcode
    price DECIMAL CHECK (price > 0),
    weight_kg DECIMAL CHECK (weight_kg > 0 AND weight_kg < 1000)
);

-- URL and domain validation
CREATE NODE TYPE Website (
    url STRING CHECK (url ~ '^https?://[a-zA-Z0-9.-]+\.[a-z]{2,}(/.*)?$'),
    domain STRING CHECK (domain ~ '^[a-zA-Z0-9.-]+\.[a-z]{2,}$')
);
```

### Range and Enumeration Validation

```gql
-- Numeric ranges
CREATE NODE TYPE Booking (
    guests INTEGER CHECK (guests >= 1 AND guests <= 20),
    nights INTEGER CHECK (nights >= 1 AND nights <= 365),
    room_number INTEGER CHECK (room_number >= 100 AND room_number <= 9999)
);

-- Enumerated values
CREATE NODE TYPE Order (
    status STRING CHECK (status IN ('draft', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    priority STRING CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    payment_method STRING CHECK (payment_method IN ('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash'))
);

-- Percentage constraints
CREATE NODE TYPE Discount (
    percentage DECIMAL CHECK (percentage >= 0 AND percentage <= 100),
    min_order_value DECIMAL CHECK (min_order_value >= 0)
);
```

### Cross-Property Validation

```gql
-- Date range validation
CREATE NODE TYPE Event (
    registration_start DATE NOT NULL,
    registration_end DATE NOT NULL,
    event_start DATE NOT NULL,
    event_end DATE NOT NULL,
    CONSTRAINT valid_registration_period CHECK (registration_end >= registration_start),
    CONSTRAINT valid_event_period CHECK (event_end >= event_start),
    CONSTRAINT registration_before_event CHECK (registration_end <= event_start)
);

-- Conditional requirements
CREATE NODE TYPE Employee (
    employment_type STRING CHECK (employment_type IN ('full_time', 'part_time', 'contractor')),
    annual_salary DECIMAL,
    hourly_rate DECIMAL,
    benefits_eligible BOOLEAN,
    CONSTRAINT compensation_model CHECK (
        (employment_type = 'full_time' AND annual_salary IS NOT NULL AND hourly_rate IS NULL)
        OR
        (employment_type IN ('part_time', 'contractor') AND annual_salary IS NULL AND hourly_rate IS NOT NULL)
    ),
    CONSTRAINT benefits_eligibility CHECK (
        employment_type = 'full_time' OR benefits_eligible = false
    )
);

-- Price consistency
CREATE NODE TYPE Product (
    base_price DECIMAL NOT NULL CHECK (base_price > 0),
    sale_price DECIMAL CHECK (sale_price > 0),
    cost DECIMAL CHECK (cost > 0),
    CONSTRAINT sale_below_base CHECK (sale_price IS NULL OR sale_price <= base_price),
    CONSTRAINT positive_margin CHECK (base_price > cost)
);
```

## Custom Validation Functions

Create reusable validation logic as database functions:

```gql
-- Email validation function
CREATE FUNCTION is_valid_email(email STRING)
RETURNS BOOLEAN
AS $$
    SELECT email IS NOT NULL
        AND email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        AND LENGTH(email) >= 5
        AND LENGTH(email) <= 255
        AND email NOT LIKE '%@%@%'  -- No multiple @ signs
$$;

-- Phone number validation (international)
CREATE FUNCTION is_valid_phone(phone STRING)
RETURNS BOOLEAN
AS $$
    SELECT phone ~ '^\+?[1-9]\d{1,14}$'  -- E.164 format
$$;

-- Credit card validation (Luhn algorithm)
CREATE FUNCTION is_valid_credit_card(number STRING)
RETURNS BOOLEAN
AS $$
    -- Simplified Luhn check
    SELECT LENGTH(number) BETWEEN 13 AND 19
        AND number ~ '^\d+$'
        AND luhn_checksum(number) = 0
$$;

-- Use in schema constraints
ALTER NODE TYPE Person
ADD CONSTRAINT check_email CHECK (is_valid_email(email));

ALTER NODE TYPE Person
ADD CONSTRAINT check_phone CHECK (is_valid_phone(phone));
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
    "go.codepros.org/geode"
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
CHECK (EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth)) >= 18)
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
- [Sanitization](/tags/sanitization) - Input sanitization techniques
- [Transactions](/tags/transactions) - Transactional validation
- [Error Handling](/tags/error-handling) - Handling validation errors
