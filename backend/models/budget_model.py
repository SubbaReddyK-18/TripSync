from marshmallow import Schema, fields, validate


class CreateBudgetSchema(Schema):
    total_amount = fields.Integer(required=True, strict=True, validate=validate.Range(min=0))
    currency = fields.String(validate=validate.Length(equal=3), missing="INR")
    category_limits = fields.Dict(values=fields.Integer(strict=True, validate=validate.Range(min=0)), missing={})


class UpdateBudgetSchema(Schema):
    total_amount = fields.Integer(strict=True, validate=validate.Range(min=0))
    category_limits = fields.Dict(values=fields.Integer(strict=True, validate=validate.Range(min=0)))
    reason = fields.String(validate=validate.Length(max=500), load_default=None)
