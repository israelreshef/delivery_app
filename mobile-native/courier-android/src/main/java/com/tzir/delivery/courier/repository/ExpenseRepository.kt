package com.tzir.delivery.courier.repository

import com.tzir.delivery.courier.model.BusinessExpense
import com.tzir.delivery.courier.model.ExpenseCategory
import com.tzir.delivery.courier.network.DeliveryApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

data class Expense(
    val id: Int,
    val category: ExpenseCategory,
    val subcategory: String = "",
    val description: String,
    val amount: Double,
    val date: String = LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
)

private fun BusinessExpense.toExpense(): Expense = Expense(
    id = id,
    category = ExpenseCategory.entries.find { it.name == category } ?: ExpenseCategory.OTHER,
    subcategory = subcategory,
    description = description,
    amount = amount,
    date = date
)

class ExpenseRepository(
    private val api: DeliveryApi? = null
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _expenses = MutableStateFlow<List<Expense>>(emptyList())
    val expenses: StateFlow<List<Expense>> = _expenses.asStateFlow()

    private val _isOffline = MutableStateFlow(false)
    val isOffline: StateFlow<Boolean> = _isOffline.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    fun add(expense: Expense) {
        scope.launch {
            try {
                api?.createBusinessExpense(
                    category = expense.category.name,
                    description = expense.description,
                    amount = expense.amount
                )
                refresh()
            } catch (_: Exception) {
                _isOffline.value = true
            }
        }
    }

    fun delete(id: Int) {
        scope.launch {
            try {
                api?.deleteBusinessExpense(id)
                _expenses.value = _expenses.value.filter { it.id != id }
            } catch (_: Exception) {
                _isOffline.value = true
            }
        }
    }

    fun totalForCategory(category: ExpenseCategory): Double {
        return _expenses.value.filter { it.category == category }.sumOf { it.amount }
    }

    fun total(): Double {
        return _expenses.value.sumOf { it.amount }
    }

    suspend fun refresh(year: Int? = null, month: Int? = null) {
        _loading.value = true
        try {
            api?.let {
                val response = it.getBusinessExpenses(year, month)
                _expenses.value = response.data.map { e -> e.toExpense() }
            }
            _isOffline.value = false
        } catch (e: Exception) {
            _isOffline.value = true
        } finally {
            _loading.value = false
        }
    }
}
