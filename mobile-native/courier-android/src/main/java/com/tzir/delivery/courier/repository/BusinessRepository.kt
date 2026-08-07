package com.tzir.delivery.courier.repository

import com.tzir.delivery.courier.model.AnnualReport
import com.tzir.delivery.courier.model.BusinessOverview
import com.tzir.delivery.courier.model.CourierReceipt
import com.tzir.delivery.courier.model.ExpenseSummary
import com.tzir.delivery.courier.model.MonthlyReport
import com.tzir.delivery.courier.network.DeliveryApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Calendar

class BusinessRepository(
    private val api: DeliveryApi? = null
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _receipts = MutableStateFlow<List<CourierReceipt>>(emptyList())
    val receipts: StateFlow<List<CourierReceipt>> = _receipts.asStateFlow()

    private val _overview = MutableStateFlow(BusinessOverview())
    val overview: StateFlow<BusinessOverview> = _overview.asStateFlow()

    private val _monthlyReport = MutableStateFlow(MonthlyReport())
    val monthlyReport: StateFlow<MonthlyReport> = _monthlyReport.asStateFlow()

    private val _annualReport = MutableStateFlow(AnnualReport())
    val annualReport: StateFlow<AnnualReport> = _annualReport.asStateFlow()

    private val _expenseSummary = MutableStateFlow(ExpenseSummary())
    val expenseSummary: StateFlow<ExpenseSummary> = _expenseSummary.asStateFlow()

    private val _isOffline = MutableStateFlow(false)
    val isOffline: StateFlow<Boolean> = _isOffline.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    private fun currentMonthYear(): Pair<Int, Int> {
        val cal = Calendar.getInstance()
        return cal.get(Calendar.MONTH) + 1 to cal.get(Calendar.YEAR)
    }

    suspend fun refresh() {
        _loading.value = true
        val (month, year) = currentMonthYear()
        try {
            api?.let {
                _overview.value = it.getBusinessOverview(year, month)
                _receipts.value = it.getBusinessReceipts(year, month).data
                _monthlyReport.value = it.getMonthlyReport(year, month)
                _annualReport.value = it.getAnnualReport(year)
                _expenseSummary.value = it.getExpenseSummary(year, month)
            }
            _isOffline.value = false
        } catch (e: Exception) {
            _isOffline.value = true
        } finally {
            _loading.value = false
        }
    }

    suspend fun refreshReceipts() {
        val (month, year) = currentMonthYear()
        try {
            api?.let { _receipts.value = it.getBusinessReceipts(year, month).data }
        } catch (_: Exception) { }
    }

    /** Creates a receipt on the server and refreshes the list. Returns the created receipt. */
    suspend fun createReceipt(
        clientName: String,
        amount: Double,
        description: String? = null,
        paymentMethod: String? = null,
        clientTaxId: String? = null
    ): CourierReceipt? {
        val created = api?.createReceipt(clientName, amount, description, paymentMethod, clientTaxId)
        if (created != null) refreshReceipts()
        return created
    }

    /** Downloads the receipt document bytes ("pdf" or "docx"). */
    suspend fun downloadReceiptDocument(id: Int, format: String): ByteArray? {
        return api?.downloadReceiptDocument(id, format)
    }
}
