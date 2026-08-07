package com.tzir.delivery.courier.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class BusinessExpense(
    val id: Int = 0,
    val category: String = "OTHER",
    val subcategory: String = "",
    val description: String = "",
    val amount: Double = 0.0,
    @SerialName("base_amount") val baseAmount: Double = 0.0,
    @SerialName("vat_amount") val vatAmount: Double = 0.0,
    val date: String = "",
    @SerialName("vendor_name") val vendorName: String? = null,
    @SerialName("payment_method") val paymentMethod: String? = null,
)

@Serializable
data class CategoryTotal(
    val category: String = "OTHER",
    val total: Double = 0.0,
)

@Serializable
data class ExpenseSummary(
    val total: Double = 0.0,
    val count: Int = 0,
    @SerialName("by_category") val byCategory: List<CategoryTotal> = emptyList(),
)

@Serializable
data class CourierReceipt(
    val id: Int = 0,
    @SerialName("receipt_number") val receiptNumber: String = "",
    @SerialName("client_name") val clientName: String = "",
    @SerialName("client_tax_id") val clientTaxId: String? = null,
    val description: String? = null,
    val amount: Double = 0.0,
    @SerialName("base_amount") val baseAmount: Double = 0.0,
    @SerialName("vat_amount") val vatAmount: Double = 0.0,
    @SerialName("payment_method") val paymentMethod: String? = null,
    @SerialName("issue_date") val issueDate: String = "",
)

@Serializable
data class BusinessOverview(
    val period: String = "",
    @SerialName("receipts_count") val receiptsCount: Int = 0,
    @SerialName("expenses_total") val expensesTotal: Double = 0.0,
    @SerialName("monthly_revenue") val monthlyRevenue: Double = 0.0,
    @SerialName("monthly_profit") val monthlyProfit: Double = 0.0,
    @SerialName("deliveries_count") val deliveriesCount: Int = 0,
)

@Serializable
data class MonthlyReport(
    val period: String = "",
    val revenue: Double = 0.0,
    @SerialName("deliveries_count") val deliveriesCount: Int = 0,
    val expenses: Double = 0.0,
    @SerialName("vat_collected") val vatCollected: Double = 0.0,
    @SerialName("vat_deductible") val vatDeductible: Double = 0.0,
    @SerialName("vat_due") val vatDue: Double = 0.0,
    val profit: Double = 0.0,
    @SerialName("pension_contribution") val pensionContribution: Double = 0.0,
    @SerialName("study_fund_contribution") val studyFundContribution: Double = 0.0,
)

@Serializable
data class AnnualReport(
    val year: Int = 0,
    @SerialName("total_revenue") val totalRevenue: Double = 0.0,
    @SerialName("total_expenses") val totalExpenses: Double = 0.0,
    @SerialName("net_profit") val netProfit: Double = 0.0,
    @SerialName("deliveries_count") val deliveriesCount: Int = 0,
    @SerialName("social_security_estimate") val socialSecurityEstimate: Double = 0.0,
    @SerialName("monthly_avg") val monthlyAvg: Double = 0.0,
    @SerialName("tax_bracket_hint") val taxBracketHint: String = "",
    @SerialName("pension_contribution") val pensionContribution: Double = 0.0,
    @SerialName("study_fund_contribution") val studyFundContribution: Double = 0.0,
)
