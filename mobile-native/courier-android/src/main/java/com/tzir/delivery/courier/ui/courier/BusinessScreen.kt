package com.tzir.delivery.courier.ui.courier

import androidx.compose.animation.*
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.*

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────

enum class BusinessCategory(
    val label: String,
    val description: String,
    val icon: ImageVector,
    val color: Color
) {
    RECEIPTS(
        label = "קבלות",
        description = "קבלות תשלום ואישורי עסקאות",
        icon = Icons.Default.Receipt,
        color = Color(0xFF3B82F6)
    ),
    REPORTS(
        label = "דוחות",
        description = "דוחות ביצועים, מכירות וסטטיסטיקות",
        icon = Icons.Default.BarChart,
        color = Color(0xFF10B981)
    ),
    EXPENSES(
        label = "הוצאות",
        description = "מעקב הוצאות, תשלומים ועלויות",
        icon = Icons.Default.AccountBalanceWallet,
        color = Color(0xFFF59E0B)
    )
}

data class BusinessSubItem(
    val label: String,
    val icon: ImageVector,
    val tag: String? = null
)

val BUSINESS_SUB_ITEMS = mapOf(
    BusinessCategory.RECEIPTS to listOf(
        BusinessSubItem("כל הקבלות", Icons.Default.ListAlt),
        BusinessSubItem("קבלות חודש נוכחי", Icons.Default.CalendarToday),
        BusinessSubItem("ייצוא קבלות (PDF)", Icons.Default.FileDownload),
        BusinessSubItem("הפקת קבלה חדשה", Icons.Default.AddCircleOutline, tag = "חדש")
    ),
    BusinessCategory.REPORTS to listOf(
        BusinessSubItem("דוח הכנסות שבועי", Icons.Default.TrendingUp),
        BusinessSubItem("דוח ביצועי משלוחים", Icons.Default.Speed),
        BusinessSubItem("דוח חודשי", Icons.Default.DateRange),
        BusinessSubItem("דוח רגולטורי שנתי", Icons.Default.Gavel, tag = "חובה")
    ),
    BusinessCategory.EXPENSES to listOf(
        BusinessSubItem("כל ההוצאות", Icons.Default.MoneyOff),
        BusinessSubItem("הוצאות חודש נוכחי", Icons.Default.CalendarToday),
        BusinessSubItem("הוצאות לפי קטגוריה", Icons.Default.Category),
        BusinessSubItem("הוסף הוצאה", Icons.Default.AddCircleOutline, tag = "חדש")
    )
)

// ─────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────

@Composable
fun BusinessScreen() {
    var selectedCategory by remember { mutableStateOf<BusinessCategory?>(null) }

    PremiumBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
        ) {
            Spacer(Modifier.height(24.dp))

            AnimatedContent(
                targetState = selectedCategory,
                transitionSpec = {
                    if (targetState != null) {
                        (slideInHorizontally { -it } + fadeIn()) togetherWith
                                (slideOutHorizontally { it } + fadeOut())
                    } else {
                        (slideInHorizontally { it } + fadeIn()) togetherWith
                                (slideOutHorizontally { -it } + fadeOut())
                    }
                },
                label = "business_nav"
            ) { category ->
                if (category == null) {
                    // ── Main Category List ──
                    CategoryListView(onCategorySelected = { selectedCategory = it })
                } else {
                    // ── Sub-items for selected category ──
                    SubItemsView(
                        category = category,
                        onBack = { selectedCategory = null }
                    )
                }
            }
        }
    }
}

// ─────────────────────────────────────────────
// Category List View
// ─────────────────────────────────────────────

@Composable
private fun CategoryListView(onCategorySelected: (BusinessCategory) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Header
        Text(
            "ניהול עסקי",
            fontSize = 34.sp,
            fontWeight = FontWeight.Black,
            color = Color.White,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        Text(
            "קבלות, דוחות וניהול הוצאות",
            fontSize = 15.sp,
            color = Color.Gray,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        // Summary mini-cards
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            BusinessCategory.entries.forEach { cat ->
                GlassCard(
                    modifier = Modifier.weight(1f),
                    cornerRadius = 16.dp
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            cat.icon,
                            contentDescription = null,
                            tint = cat.color,
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            cat.label,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = cat.color
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(8.dp))

        // Category rows
        BusinessCategory.entries.forEach { cat ->
            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onCategorySelected(cat) },
                cornerRadius = 20.dp
            ) {
                Row(
                    modifier = Modifier.padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Icon circle
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = cat.color.copy(alpha = 0.15f),
                        modifier = Modifier.size(56.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                cat.icon,
                                contentDescription = null,
                                tint = cat.color,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                    }

                    Spacer(Modifier.width(16.dp))

                    // Text
                    Column(Modifier.weight(1f)) {
                        Text(
                            cat.label,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Spacer(Modifier.height(2.dp))
                        Text(
                            cat.description,
                            fontSize = 13.sp,
                            color = Color.Gray
                        )
                    }

                    // Arrow
                    Icon(
                        Icons.Default.ChevronLeft,
                        contentDescription = null,
                        tint = Color.Gray.copy(alpha = 0.5f),
                        modifier = Modifier.size(22.dp)
                    )
                }
            }
        }

        Spacer(Modifier.height(32.dp))
    }
}

// ─────────────────────────────────────────────
// Sub-Items View
// ─────────────────────────────────────────────

@Composable
private fun SubItemsView(
    category: BusinessCategory,
    onBack: () -> Unit
) {
    val subItems = BUSINESS_SUB_ITEMS[category] ?: emptyList()

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Back button + header
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .clickable { onBack() }
                .padding(bottom = 4.dp)
        ) {
            Icon(
                Icons.Default.ArrowBack,
                contentDescription = "חזור",
                tint = category.color,
                modifier = Modifier.size(20.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text("חזור", fontSize = 14.sp, color = category.color, fontWeight = FontWeight.Medium)
        }

        Row(verticalAlignment = Alignment.CenterVertically) {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = category.color.copy(alpha = 0.15f),
                modifier = Modifier.size(48.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(category.icon, contentDescription = null, tint = category.color, modifier = Modifier.size(24.dp))
                }
            }
            Spacer(Modifier.width(14.dp))
            Column {
                Text(category.label, fontSize = 26.sp, fontWeight = FontWeight.Black, color = Color.White)
                Text(category.description, fontSize = 13.sp, color = Color.Gray)
            }
        }

        Spacer(Modifier.height(4.dp))

        // Sub-items card
        GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 20.dp) {
            Column {
                subItems.forEachIndexed { index, item ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { /* Navigate to item */ }
                            .padding(horizontal = 20.dp, vertical = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = category.color.copy(alpha = 0.12f),
                            modifier = Modifier.size(38.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(item.icon, contentDescription = null, tint = category.color, modifier = Modifier.size(18.dp))
                            }
                        }
                        Spacer(Modifier.width(14.dp))
                        Text(
                            item.label,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color.White,
                            modifier = Modifier.weight(1f)
                        )
                        if (item.tag != null) {
                            Surface(
                                color = category.color.copy(alpha = 0.18f),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    item.tag,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = category.color
                                )
                            }
                            Spacer(Modifier.width(8.dp))
                        }
                        Icon(
                            Icons.Default.ChevronLeft,
                            contentDescription = null,
                            tint = Color.Gray.copy(alpha = 0.4f),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    if (index < subItems.lastIndex) {
                        HorizontalDivider(
                            color = Color.White.copy(alpha = 0.07f),
                            modifier = Modifier.padding(start = 72.dp)
                        )
                    }
                }
            }
        }

        // Tip card
        GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 16.dp) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.Top
            ) {
                Text("💡", fontSize = 18.sp)
                Spacer(Modifier.width(10.dp))
                Text(
                    when (category) {
                        BusinessCategory.RECEIPTS -> "ניתן לשלוח קבלות ישירות ללקוחות כ-PDF דרך WhatsApp או מייל"
                        BusinessCategory.REPORTS -> "דוחות מפורטים עוזרים לך לעקוב אחר ביצועי העסק ולהכין דו\"חות מס"
                        BusinessCategory.EXPENSES -> "מעקב קבוע אחר הוצאות מאפשר ניכוי מס מירבי בסוף השנה"
                    },
                    fontSize = 13.sp,
                    color = Color.Gray,
                    lineHeight = 20.sp
                )
            }
        }

        Spacer(Modifier.height(32.dp))
    }
}
