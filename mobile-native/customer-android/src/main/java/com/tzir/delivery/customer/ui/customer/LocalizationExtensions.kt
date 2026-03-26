package com.tzir.delivery.customer.ui.customer

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.tzir.delivery.customer.R
import com.tzir.delivery.customer.model.OrderStatus
import com.tzir.delivery.customer.model.DeliveryType

@Composable
fun OrderStatus.toHebrew(): String = when (this) {
    OrderStatus.PENDING_APPROVAL -> stringResource(R.string.status_pending_approval)
    OrderStatus.SEARCHING_COURIER -> stringResource(R.string.status_searching_courier)
    OrderStatus.ACCEPTED_BY_COURIER -> stringResource(R.string.status_accepted_by_courier)
    OrderStatus.PICKED_UP -> stringResource(R.string.status_picked_up)
    OrderStatus.DELIVERED -> stringResource(R.string.status_delivered)
    OrderStatus.CANCELLED -> stringResource(R.string.status_cancelled)
    OrderStatus.RETURNED -> stringResource(R.string.status_returned)
}

@Composable
fun DeliveryType.toHebrew(): String = when (this) {
    DeliveryType.DOCUMENT -> stringResource(R.string.type_document)
    DeliveryType.SMALL_PACKAGE -> stringResource(R.string.type_small_package)
    DeliveryType.LARGE_PACKAGE -> stringResource(R.string.type_large_package)
    DeliveryType.FOOD -> stringResource(R.string.type_food)
    DeliveryType.SENSITIVE_ITEM -> stringResource(R.string.type_sensitive_item)
    DeliveryType.LEGAL_DOCUMENT -> stringResource(R.string.type_legal_document)
}
