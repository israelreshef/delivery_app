package com.tzir.delivery.courier.model

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*

enum class ExpenseCategory(
    val displayName: String,
    val subcategories: List<String>,
    val icon: ImageVector,
    val color: Color
) {
    FOOD(
        displayName = "אוכל ושתייה",
        subcategories = listOf("אוכל", "שתייה", "קפה/תה"),
        icon = Icons.Default.Fastfood,
        color = Color(0xFFF59E0B)
    ),
    FUEL(
        displayName = "דלק",
        subcategories = listOf("בנזין", "סולר", "גז"),
        icon = Icons.Default.LocalGasStation,
        color = Color(0xFF3B82F6)
    ),
    VEHICLE_MAINTENANCE(
        displayName = "טיפולים",
        subcategories = listOf("שמן ומים", "צמיגים", "מוסך", "חלפים"),
        icon = Icons.Default.Build,
        color = Color(0xFFEF4444)
    ),
    INSURANCE(
        displayName = "ביטוח",
        subcategories = listOf("ביטוח חובה", "ביטוח מקיף"),
        icon = Icons.Default.Security,
        color = Color(0xFF8B5CF6)
    ),
    ACCOUNTING(
        displayName = "רואה חשבון",
        subcategories = listOf("דוח שנתי", "ייעוץ מס"),
        icon = Icons.Default.Description,
        color = Color(0xFFEC4899)
    ),
    TAXES(
        displayName = "מיסים",
        subcategories = listOf("מע\"מ", "ביטוח לאומי", "מס הכנסה"),
        icon = Icons.Default.AccountBalance,
        color = Color(0xFF065F46)
    ),
    FINES(
        displayName = "קנסות",
        subcategories = listOf("דו\"ח חניה", "דו\"ח תנועה"),
        icon = Icons.Default.Gavel,
        color = Color(0xFFDC2626)
    ),
    LEGAL(
        displayName = "עורך דין",
        subcategories = listOf("ייעוץ משפטי", "ייצוג"),
        icon = Icons.Default.Balance,
        color = Color(0xFF1D4ED8)
    ),
    OTHER(
        displayName = "אחר",
        subcategories = listOf("כללי"),
        icon = Icons.Default.MoreHoriz,
        color = Color.Gray
    )
}
