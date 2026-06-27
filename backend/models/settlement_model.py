from marshmallow import Schema, fields, validate


class PaySettlementSchema(Schema):
    payment_method = fields.String(validate=validate.Length(max=50))
    payment_note = fields.String(validate=validate.Length(max=500))


class ConfirmSettlementSchema(Schema):
    pass
