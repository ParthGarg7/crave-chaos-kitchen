"""
Tests for the order/delivery lifecycle state machines.

These guard the transition maps and cancellation rules introduced to fix:
- orders jumping states (pending → delivered) or moving backwards
- drivers resurrecting cancelled orders
- deliveries claimable before the restaurant marked the order READY
"""
from app.api.v1.endpoints.orders import (
    ORDER_TRANSITIONS,
    CANCELLABLE_BY_CUSTOMER,
    CANCELLABLE_BY_OWNER,
    _void_delivery_for_cancelled_order,
)
from app.api.v1.endpoints.delivery import DELIVERY_TRANSITIONS
from app.models.order import Order, OrderStatus
from app.models.delivery import Delivery, DeliveryStatus


# ── Order state machine ─────────────────────────────────────────────────────

def test_every_order_status_has_transition_entry():
    for order_status in OrderStatus:
        assert order_status in ORDER_TRANSITIONS, f"missing entry for {order_status}"


def test_happy_path_is_fully_allowed():
    path = [
        OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING,
        OrderStatus.READY, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT,
        OrderStatus.DELIVERED,
    ]
    for current, nxt in zip(path, path[1:]):
        assert nxt in ORDER_TRANSITIONS[current], f"{current} → {nxt} should be allowed"


def test_no_skipping_ahead():
    assert OrderStatus.DELIVERED not in ORDER_TRANSITIONS[OrderStatus.PENDING]
    assert OrderStatus.PICKED_UP not in ORDER_TRANSITIONS[OrderStatus.CONFIRMED]
    assert OrderStatus.READY not in ORDER_TRANSITIONS[OrderStatus.PENDING]
    assert OrderStatus.IN_TRANSIT not in ORDER_TRANSITIONS[OrderStatus.READY]


def test_no_moving_backwards():
    assert OrderStatus.PENDING not in ORDER_TRANSITIONS[OrderStatus.CONFIRMED]
    assert OrderStatus.PREPARING not in ORDER_TRANSITIONS[OrderStatus.READY]
    assert OrderStatus.CONFIRMED not in ORDER_TRANSITIONS[OrderStatus.DELIVERED]


def test_terminal_states_have_no_exits():
    assert ORDER_TRANSITIONS[OrderStatus.DELIVERED] == set()
    assert ORDER_TRANSITIONS[OrderStatus.CANCELLED] == set()
    assert ORDER_TRANSITIONS[OrderStatus.REFUNDED] == set()


def test_cancellation_not_possible_once_picked_up():
    assert OrderStatus.CANCELLED not in ORDER_TRANSITIONS[OrderStatus.PICKED_UP]
    assert OrderStatus.CANCELLED not in ORDER_TRANSITIONS[OrderStatus.IN_TRANSIT]


def test_customer_can_only_cancel_pending():
    assert CANCELLABLE_BY_CUSTOMER == {OrderStatus.PENDING}


def test_owner_can_cancel_until_pickup():
    assert OrderStatus.PICKED_UP not in CANCELLABLE_BY_OWNER
    assert OrderStatus.IN_TRANSIT not in CANCELLABLE_BY_OWNER
    assert OrderStatus.PENDING in CANCELLABLE_BY_OWNER
    assert OrderStatus.READY in CANCELLABLE_BY_OWNER


# ── Delivery state machine ──────────────────────────────────────────────────

def test_delivery_happy_path_allowed():
    path = [
        DeliveryStatus.ACCEPTED, DeliveryStatus.AT_RESTAURANT,
        DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT,
        DeliveryStatus.DELIVERED,
    ]
    for current, nxt in zip(path, path[1:]):
        assert nxt in DELIVERY_TRANSITIONS[current], f"{current} → {nxt} should be allowed"


def test_delivery_cannot_jump_to_delivered_from_accepted():
    assert DeliveryStatus.DELIVERED not in DELIVERY_TRANSITIONS[DeliveryStatus.ACCEPTED]
    assert DeliveryStatus.DELIVERED not in DELIVERY_TRANSITIONS[DeliveryStatus.PICKED_UP]


def test_delivery_terminal_states():
    assert DELIVERY_TRANSITIONS[DeliveryStatus.DELIVERED] == set()
    assert DELIVERY_TRANSITIONS[DeliveryStatus.FAILED] == set()


# ── Cancel voids the delivery ───────────────────────────────────────────────

def test_cancel_fails_active_delivery():
    order = Order(status=OrderStatus.CANCELLED)
    order.delivery = Delivery(status=DeliveryStatus.ACCEPTED)
    _void_delivery_for_cancelled_order(order)
    assert order.delivery.status == DeliveryStatus.FAILED


def test_cancel_leaves_completed_delivery_untouched():
    order = Order(status=OrderStatus.CANCELLED)
    order.delivery = Delivery(status=DeliveryStatus.DELIVERED)
    _void_delivery_for_cancelled_order(order)
    assert order.delivery.status == DeliveryStatus.DELIVERED


def test_cancel_with_no_delivery_is_noop():
    order = Order(status=OrderStatus.CANCELLED)
    order.delivery = None
    _void_delivery_for_cancelled_order(order)  # must not raise
