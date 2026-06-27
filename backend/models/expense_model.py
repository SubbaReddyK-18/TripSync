from marshmallow import Schema, fields, validate, validates, ValidationError


class CreateExpenseSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=1, max=200))
    amount = fields.Integer(required=True, strict=True, validate=validate.Range(min=1))
    currency = fields.String(validate=validate.Length(equal=3), missing="INR")
    category = fields.String(
        validate=validate.OneOf(["food", "transport", "accommodation", "activity", "shopping", "medical", "other"]),
        missing="other",
    )
    date = fields.Date(required=True, format="%Y-%m-%d")
    paid_by = fields.Raw(required=True)
    split_type = fields.String(validate=validate.OneOf(["equal", "custom"]), missing="equal")
    split_among = fields.List(fields.String(), required=True)
    splits = fields.List(fields.Dict(), missing=None)
    notes = fields.String(validate=validate.Length(max=1000))
    receipts = fields.List(fields.Dict(), missing=None)

    @validates("split_among")
    def validate_split_among(self, value):
        if len(value) < 1:
            raise ValidationError("At least one person must be included in the split")


class UpdateExpenseSchema(Schema):
    title = fields.String(validate=validate.Length(min=1, max=200))
    amount = fields.Integer(strict=True, validate=validate.Range(min=1))
    category = fields.String(
        validate=validate.OneOf(["food", "transport", "accommodation", "activity", "shopping", "medical", "other"])
    )
    date = fields.Date(format="%Y-%m-%d")
    paid_by = fields.Raw()
    split_type = fields.String(validate=validate.OneOf(["equal", "custom"]))
    split_among = fields.List(fields.String())
    splits = fields.List(fields.Dict())
    notes = fields.String(validate=validate.Length(max=1000))
    receipts = fields.List(fields.Dict())
