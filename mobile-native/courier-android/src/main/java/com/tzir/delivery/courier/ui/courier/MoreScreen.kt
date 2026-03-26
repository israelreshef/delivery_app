package com.tzir.delivery.courier.ui.courier

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.*

@Composable
fun MoreScreen(
    userName: String,
    onProfileClick: () -> Unit,
    onEarningsClick: () -> Unit,
    onRouteClick: () -> Unit,
    onCalendarClick: () -> Unit,
    onDocumentsClick: () -> Unit,
    onVehiclesClick: () -> Unit,
    onAcademyClick: () -> Unit,
    onSupportClick: () -> Unit,
    onSettingsClick: () -> Unit,
    onLogout: () -> Unit
) {
    PremiumBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
        ) {
            Spacer(Modifier.height(24.dp))
            
            Text(
                "עוד",
                fontSize = 34.sp,
                fontWeight = FontWeight.Black,
                color = Color.White,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // --- 1. Profile Header ---
            Column(
                modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Surface(
                    modifier = Modifier.size(80.dp),
                    shape = CircleShape,
                    color = AmberGold.copy(alpha = 0.2f)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(userName.firstOrNull()?.uppercase() ?: "I", fontSize = 32.sp, fontWeight = FontWeight.Bold, color = AmberGold)
                    }
                }
                Spacer(Modifier.height(12.dp))
                Text(userName, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }

            // --- 2. Premium Badge Item ---
            GlassCard(
                modifier = Modifier.fillMaxWidth().clickable { onProfileClick() },
                cornerRadius = 16.dp
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(modifier = Modifier.size(40.dp), shape = CircleShape, color = Color.Gray.copy(alpha = 0.2f)) {
                        Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.Person, null, tint = AmberGold) }
                    }
                    Spacer(Modifier.width(16.dp))
                    Column(Modifier.weight(1f)) {
                        Text(userName, fontWeight = FontWeight.Bold, color = Color.White)
                        Text("#8E8E93", fontSize = 12.sp, color = Color.Gray)
                    }
                    Surface(color = AmberGold, shape = RoundedCornerShape(8.dp)) {
                        Text("שליח פרימיום", modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp), fontSize = 11.sp, fontWeight = FontWeight.Black, color = Graphite950)
                    }
                    Icon(Icons.Default.ChevronLeft, null, tint = Color.Gray, modifier = Modifier.padding(start = 8.dp))
                }
            }

            Spacer(Modifier.height(16.dp))

            // --- 3. Main Tools Section ---
            MoreSection(items = listOf(
                MoreItem("תכנון מסלולים", Icons.Default.Map, onClick = onRouteClick),
                MoreItem("יומן עבודה", Icons.Default.CalendarToday, onClick = onCalendarClick),
                MoreItem("מסמכים ורגולציות", Icons.Default.Description, onClick = onDocumentsClick),
                MoreItem("ניהול כלי רכב", Icons.Default.DirectionsCar, onClick = onVehiclesClick),
            ))

            Spacer(Modifier.height(16.dp))

            // --- 4. Academy Section ---
            MoreSection(items = listOf(
                MoreItem("TZIR Academy", Icons.Default.School, badge = "חדש", onClick = onAcademyClick),
                MoreItem("צ'אט ותמיכה", Icons.Default.Chat, onClick = onSupportClick),
            ))

            Spacer(Modifier.height(16.dp))

            // --- 5. Settings ---
            MoreSection(items = listOf(
                MoreItem("הגדרות", Icons.Default.Settings, onClick = onSettingsClick),
                MoreItem("מצב לילה", Icons.Default.NightlightRound, hasSwitch = true),
            ))

            Spacer(Modifier.height(24.dp))

            // --- 6. Logout ---
            GlassCard(modifier = Modifier.fillMaxWidth().clickable { onLogout() }, cornerRadius = 14.dp) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                    Text("התנתק", color = Color.Red, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(Modifier.height(40.dp))
        }
    }
}

@Composable
fun MoreSection(items: List<MoreItem>) {
    GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 16.dp) {
        Column {
            items.forEachIndexed { i, item ->
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { item.onClick() }.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(item.icon, null, tint = Color.Gray, modifier = Modifier.size(24.dp))
                    Spacer(Modifier.width(16.dp))
                    Text(item.label, color = Color.White, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                    
                    if (item.badge != null) {
                        Surface(color = AmberGold.copy(alpha = 0.2f), shape = RoundedCornerShape(6.dp)) {
                            Text(item.badge, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = AmberGold)
                        }
                    }
                    
                    if (item.hasSwitch) {
                        Switch(checked = true, onCheckedChange = {}, colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = AmberGold))
                    } else {
                        Icon(Icons.Default.ChevronLeft, null, tint = Color.Gray.copy(alpha = 0.5f), modifier = Modifier.size(20.dp))
                    }
                }
                if (i < items.lastIndex) {
                    HorizontalDivider(color = Color.White.copy(alpha = 0.1f), modifier = Modifier.padding(start = 56.dp))
                }
            }
        }
    }
}

data class MoreItem(
    val label: String,
    val icon: ImageVector,
    val badge: String? = null,
    val hasSwitch: Boolean = false,
    val onClick: () -> Unit = {}
)
