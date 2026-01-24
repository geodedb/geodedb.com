---
title: "Data Validation"
description: "Validating data integrity and business rules in Geode graph database"
keywords: ["data validation", "input validation", "validation rules", "business rules", "data integrity", "validation constraints"]
weight: 10
---

# Data Validation

Data validation ensures that data meets defined criteria before being stored or processed. Geode supports validation at multiple levels to maintain data integrity.

## Validation Levels

### Schema Validation

Type and format validation:

```gql
CREATE PROPERTY TYPE Person (
    email STRING CHECK (email LIKE '%@%.%'),
    age INTEGER CHECK (age >= 0 AND age <= 150),
    phone STRING CHECK (LENGTH(phone) = 10)
);
```

### Business Rule Validation

```gql
CREATE CONSTRAINT check_order_total
ON Order
CHECK (total >= 0 AND total = (
    SELECT SUM(quantity * price)
    FROM OrderItem
    WHERE order_id = Order.id
));
```

## Validation Functions

### Custom Validators

```gql
CREATE FUNCTION is_valid_email(email STRING)
RETURNS BOOLEAN
AS $$
    SELECT email IS NOT NULL
        AND email LIKE '%@%.%'
        AND LENGTH(email) >= 5
        AND LENGTH(email) <= 255
$$;

-- Use in constraint
ALTER PROPERTY TYPE Person
ADD CONSTRAINT check_email CHECK (is_valid_email(email));
```

### Complex Validation

```python
async def validate_user(user_data):
    errors = []
    
    # Required fields
    if not user_data.get('email'):
        errors.append("Email is required")
    
    # Email format
    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', user_data.get('email', '')):
        errors.append("Invalid email format")
    
    # Age range
    age = user_data.get('age')
    if age is not None and (age < 0 or age > 150):
        errors.append("Age must be between 0 and 150")
    
    # Unique email
    if await client.exists("MATCH (p:Person {email: $email})", {"email": user_data['email']}):
        errors.append("Email already exists")
    
    if errors:
        raise ValidationError(errors)
    
    return True
```

## Input Sanitization

### SQL Injection Prevention

Always use parameterized queries:

```python
# Good - parameterized
await client.execute(
    "MATCH (p:Person {email: $email})",
    {"email": user_email}
)

# Bad - string concatenation
# await client.execute(f"MATCH (p:Person {{email: '{user_email}'}})")
```

### XSS Prevention

```python
from html import escape

def sanitize_input(text):
    return escape(text.strip())

user_name = sanitize_input(request.form['name'])
```

## Validation Patterns

### Pre-Insert Validation

```gql
CREATE TRIGGER validate_before_insert
BEFORE INSERT ON Person
FOR EACH ROW
WHEN (NEW.age < 0 OR NEW.age > 150)
EXECUTE GQL
    SIGNAL 'Invalid age value';
```

### Async Validation

```python
from marshmallow import Schema, fields, validates, ValidationError

class UserSchema(Schema):
    email = fields.Email(required=True)
    age = fields.Integer(required=True)
    name = fields.String(required=True)
    
    @validates('age')
    def validate_age(self, value):
        if value < 0 or value > 150:
            raise ValidationError("Age must be between 0 and 150")

schema = UserSchema()
validated_data = schema.load(user_input)
```

## Error Reporting

```python
class ValidationResult:
    def __init__(self):
        self.errors = []
        self.warnings = []
    
    def add_error(self, field, message):
        self.errors.append({"field": field, "message": message})
    
    def add_warning(self, field, message):
        self.warnings.append({"field": field, "message": message})
    
    def is_valid(self):
        return len(self.errors) == 0
    
    def to_dict(self):
        return {
            "valid": self.is_valid(),
            "errors": self.errors,
            "warnings": self.warnings
        }
```

## Best Practices

- Validate early
- Provide clear error messages
- Use type-safe schemas
- Sanitize all inputs
- Log validation failures

## Related Topics

- [Constraints](/tags/constraints) - Schema constraints
- [Data Quality](/tags/data-quality) - Data quality
