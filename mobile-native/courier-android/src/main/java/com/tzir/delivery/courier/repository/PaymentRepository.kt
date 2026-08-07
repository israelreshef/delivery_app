@file:Suppress("UNCHECKED_CAST")

package com.tzir.delivery.courier.repository

import com.tzir.delivery.courier.network.DeliveryApi
import com.tzir.delivery.courier.services.SocketManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.tzir.delivery.courier.model.PaymentMethod
import org.json.JSONObject

data class WalletBalance(
    val balance: Double,
    val currency: String,
    val pendingWithdrawals: List<WithdrawalSummary> = emptyList()
)

data class WithdrawalSummary(
    val id: Int,
    val amount: Double,
    val createdAt: String
)

data class LedgerEntry(
    val id: Int,
    val amount: Double,
    val entryType: String,
    val description: String?,
    val balanceBefore: Double,
    val balanceAfter: Double,
    val createdAt: String
)

data class WithdrawalRequestItem(
    val id: Int,
    val amount: Double,
    val status: String,
    val paymentDetails: String?,
    val adminNotes: String?,
    val createdAt: String?,
    val processedAt: String?
)

class PaymentRepository(
    private val api: DeliveryApi? = null
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _walletBalance = MutableStateFlow(WalletBalance(0.0, "ILS"))
    val walletBalance: StateFlow<WalletBalance> = _walletBalance.asStateFlow()

    private val _ledgerHistory = MutableStateFlow<List<LedgerEntry>>(emptyList())
    val ledgerHistory: StateFlow<List<LedgerEntry>> = _ledgerHistory.asStateFlow()

    private val _withdrawalHistory = MutableStateFlow<List<WithdrawalRequestItem>>(emptyList())
    val withdrawalHistory: StateFlow<List<WithdrawalRequestItem>> = _withdrawalHistory.asStateFlow()

    private val _isOffline = MutableStateFlow(false)
    val isOffline: StateFlow<Boolean> = _isOffline.asStateFlow()

    private val _lastWalletEvent = MutableStateFlow<String?>(null)
    val lastWalletEvent: StateFlow<String?> = _lastWalletEvent.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        scope.launch {
            SocketManager.walletUpdates.collect { data ->
                _lastWalletEvent.value = data
                refresh()
            }
        }
    }

    fun refresh() {
        scope.launch { refreshBalance() }
        scope.launch { refreshLedger() }
        scope.launch { refreshWithdrawals() }
        fetchPaymentMethods()
    }

    private suspend fun refreshBalance() {
        try {
            api?.let {
                val json = it.getWalletBalance()
                val obj = JSONObject(json.toString())
                _walletBalance.value = WalletBalance(
                    balance = obj.optDouble("balance", 0.0),
                    currency = obj.optString("currency", "ILS"),
                    pendingWithdrawals = (obj.optJSONArray("pending_withdrawals")?.let { arr ->
                        (0 until arr.length()).map { i ->
                            val item = arr.getJSONObject(i)
                            WithdrawalSummary(item.getInt("id"), item.getDouble("amount"), item.optString("created_at", ""))
                        }
                    }) ?: emptyList()
                )
                _isOffline.value = false
            }
        } catch (e: Exception) {
            _isOffline.value = true
        }
    }

    suspend fun refreshLedger() {
        try {
            api?.let {
                val json = it.getWalletHistory()
                val obj = JSONObject(json.toString())
                val entries = obj.optJSONArray("entries") ?: return
                _ledgerHistory.value = (0 until entries.length()).map { i ->
                    val e = entries.getJSONObject(i)
                    LedgerEntry(
                        id = e.getInt("id"),
                        amount = e.getDouble("amount"),
                        entryType = e.getString("entry_type"),
                        description = e.optString("description", null),
                        balanceBefore = e.getDouble("balance_before"),
                        balanceAfter = e.getDouble("balance_after"),
                        createdAt = e.optString("created_at", "")
                    )
                }
                _isOffline.value = false
            }
        } catch (e: Exception) {
            _isOffline.value = true
        }
    }

    private suspend fun refreshWithdrawals() {
        try {
            api?.let {
                val json = it.getWithdrawalHistory()
                val obj = JSONObject(json.toString())
                val items = obj.optJSONArray("withdrawals") ?: return
                _withdrawalHistory.value = (0 until items.length()).map { i ->
                    val w = items.getJSONObject(i)
                    WithdrawalRequestItem(
                        id = w.getInt("id"),
                        amount = w.getDouble("amount"),
                        status = w.getString("status"),
                        paymentDetails = w.optString("payment_details", null),
                        adminNotes = w.optString("admin_notes", null),
                        createdAt = w.optString("created_at", null),
                        processedAt = w.optString("processed_at", null)
                    )
                }
                _isOffline.value = false
            }
        } catch (e: Exception) {
            _isOffline.value = true
        }
    }

    suspend fun createWithdrawal(amount: Double, paymentDetails: String): String? {
        return try {
            api?.let {
                val json = it.createWithdrawal(amount, paymentDetails)
                val obj = JSONObject(json.toString())
                if (obj.optString("status") == "pending") {
                    refresh()
                    null
                } else {
                    obj.optString("error", "Unknown error")
                }
            } ?: "API not available"
        } catch (e: Exception) {
            e.message ?: "Failed to create withdrawal"
        }
    }

    private val _paymentMethods = MutableStateFlow<List<PaymentMethod>>(emptyList())
    val paymentMethods: StateFlow<List<PaymentMethod>> = _paymentMethods.asStateFlow()

    fun fetchPaymentMethods() {
        scope.launch {
            try {
                val result = api?.getPaymentMethods() ?: emptyList()
                _paymentMethods.value = result
            } catch (e: Exception) {
                _error.value = "Failed to load payment methods"
            }
        }
    }

    fun addPaymentMethod(methodType: String, label: String, details: Map<String, String>, isDefault: Boolean = false) {
        scope.launch {
            try {
                val result = api?.addPaymentMethod(methodType, label, details, isDefault)
                if (result != null) {
                    fetchPaymentMethods()
                } else {
                    _error.value = "Failed to add payment method"
                }
            } catch (e: Exception) {
                _error.value = "Failed to add payment method"
            }
        }
    }

    fun setDefaultPaymentMethod(methodId: Int) {
        scope.launch {
            try {
                val success = api?.setDefaultPaymentMethod(methodId) ?: false
                if (success) {
                    fetchPaymentMethods()
                } else {
                    _error.value = "Failed to set default payment method"
                }
            } catch (e: Exception) {
                _error.value = "Failed to set default payment method"
            }
        }
    }

    fun deletePaymentMethod(methodId: Int) {
        scope.launch {
            try {
                val success = api?.deletePaymentMethod(methodId) ?: false
                if (success) {
                    fetchPaymentMethods()
                } else {
                    _error.value = "Failed to delete payment method"
                }
            } catch (e: Exception) {
                _error.value = "Failed to delete payment method"
            }
        }
    }
}
