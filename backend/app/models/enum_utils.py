"""SQLAlchemy Enum helpers for PostgreSQL."""
from enum import Enum as PyEnum

from sqlalchemy import Enum as SAEnum


def pg_str_enum(enum_class: type[PyEnum]) -> SAEnum:
    """
    Persist Python str-Enums using member .value (e.g. 'upi', 'pending'),
    not .name ('UPI', 'PENDING'). PostgreSQL enums created from these values
    reject uppercase names from the default SQLAlchemy binding.
    """

    def values_callable(_: type[PyEnum]) -> list[str]:
        return [member.value for member in enum_class]

    return SAEnum(enum_class, values_callable=values_callable)
