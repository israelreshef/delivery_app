
package com.tzir.delivery.courier.ui.courier

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.graphics.Paint
import android.graphics.Typeface
import com.tzir.delivery.courier.R
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.BrandBlue
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import kotlinx.coroutines.launch
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.model.User
import com.tzir.delivery.courier.repository.CourierRepository
import com.tzir.delivery.courier.repository.EarningsRepository
import com.tzir.delivery.courier.repository.PaymentRepository
import com.tzir.delivery.courier.repository.PeakHourData

/**
 * Saves a CSV ByteArray to the device Downloads folder.
 * Returns the Uri of the saved file, or null on failure.
 */
fun saveEarningsCsv(context: Context, bytes: ByteArray, filename: String): Uri? {
    return try {
        val resolver = context.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, filename)
            put(MediaStore.Downloads.MIME_TYPE, "text/csv")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
        }
        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: return null
        resolver.openOutputStream(uri)?.use { it.write(bytes) }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            values.clear()
            values.put(MediaStore.Downloads.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
        }
        uri
    } catch (e: Exception) {
        e.printStackTrace()
        null
    }
}

@Composable
fun EarningsScreen(
    user: User,
    repository: CourierRepository,
    earningsRepository: EarningsRepository? = null,
    paymentRepository: PaymentRepository? = null,
    onShowHistory: () -> Unit,
    onBack: () -> Unit = {},
    onBalanceClick: (() -> Unit)? = null
) {
    val stats by repository.stats.collectAsState()
    val isOffline by repository.isOffline.collectAsState()
    val weeklyChartData by (earningsRepository?.weeklyChart?.collectAsState() ?: remember { mutableStateOf(com.tzir.delivery.courier.repository.WeeklyChartData()) })
    val peakHoursState = earningsRepository?.peakHours?.collectAsState() ?: remember { mutableStateOf(emptyList<PeakHourData>()) }
    val peakHoursData = peakHoursState.value
    val walletBalance by (paymentRepository?.walletBalance?.collectAsState() ?: remember { mutableStateOf(com.tzir.delivery.courier.repository.WalletBalance(0.0, "ILS")) })
    var isLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        if (stats == null) {
            isLoading = true
            repository.refreshStats(user.id)
            isLoading = false
        } else {
            repository.refreshStats(user.id)
        }
    }
    LaunchedEffect(stats) {
        stats?.let { earningsRepository?.calculateFromStats(it) }
    }
    LaunchedEffect(paymentRepository) {
        paymentRepository?.refresh()
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = Color.Transparent
    ) { scaffoldPadding ->
        PremiumBackground {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(scaffoldPadding)
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                // Header with Back Button
                Row(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.background(Color.White, CircleShape).size(40.dp)
                    ) {
                        Icon(
                            Icons.Default.ArrowBack,
                            contentDescription = "חזור",
                            tint = TextOfficial
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = stringResource(com.tzir.delivery.courier.R.string.your_earnings),
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Black,
                        color = TextOfficial
                    )
                }

                if (isLoading) {
                    ShimmerItem(height = 200.dp, shape = MaterialTheme.shapes.large)
                    Spacer(modifier = Modifier.height(24.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        ShimmerItem(height = 100.dp, width = Modifier.weight(1f))
                        ShimmerItem(height = 100.dp, width = Modifier.weight(1f))
                    }
                } else {
                    if (isOffline) {
                        Surface(
                            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                            color = Color(0xFFFFEBEE),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text(
                                "Showing cached earnings. Reconnect to see latest balance.",
                                modifier = Modifier.padding(12.dp),
                                color = Color(0xFFD32F2F),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    
                    // Premium Stats Card
                    GlassCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(220.dp),
                        cornerRadius = 28.dp
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(24.dp)
                        ) {
                            Column {
                                Text(
                                    stringResource(com.tzir.delivery.courier.R.string.total_balance),
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp
                                )
                                Text(
                                    "₪${"%,.0f".format(walletBalance.balance)}",
                                    color = MaterialTheme.colorScheme.onSurface,
                                    fontSize = 48.sp,
                                    fontWeight = FontWeight.Black,
                                    letterSpacing = (-1).sp
                                )

                                if (walletBalance.pendingWithdrawals.isNotEmpty()) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Surface(color = BrandBlue.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp)) {
                                        val pendingTotal = walletBalance.pendingWithdrawals.sumOf { it.amount }
                                        Text("₪${"%,.0f".format(pendingTotal)} בהמתנה לאישור", modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BrandBlue)
                                    }
                                }

                                Spacer(modifier = Modifier.weight(1f))

                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    StatMiniItem(stringResource(com.tzir.delivery.courier.R.string.total_deliveries), "${stats?.totalDeliveries ?: 0}")
                                    StatMiniItem(stringResource(com.tzir.delivery.courier.R.string.avg_rating), "⭐ ${stats?.rating ?: 5.0}")
                                }

                                Spacer(modifier = Modifier.height(12.dp))

                                Button(
                                    onClick = { onBalanceClick?.invoke() },
                                    modifier = Modifier.fillMaxWidth().height(44.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = BrandBlue),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text("💰", fontSize = 16.sp)
                                    Spacer(Modifier.width(8.dp))
                                    Text("משוך כספים", fontWeight = FontWeight.Black, color = Navy950, fontSize = 14.sp)
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        EarningsSectionCard(stringResource(com.tzir.delivery.courier.R.string.today), "₪${stats?.todayEarnings ?: 0.0}", BrandBlue.copy(alpha = 0.1f), Modifier.weight(1f))
                        EarningsSectionCard(stringResource(com.tzir.delivery.courier.R.string.this_week), "₪${stats?.weeklyEarnings ?: 0.0}", TextOfficial.copy(alpha = 0.1f), Modifier.weight(1f))
                    }
                    
                    // Add other components...
                    Spacer(modifier = Modifier.height(24.dp))
                    Text("📊 מדדי ביצוע", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold, color = TextOfficial)
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        KpiCard("שיעור השלמה", "${stats?.completionRate ?: 96}פ", Color(0xFF10B981), Modifier.weight(1f))
                        KpiCard("זמן ממוצע", "${stats?.avgDeliveryMins ?: 22}דק'", Color(0xFF3B82F6), Modifier.weight(1f))
                    }

                    Spacer(modifier = Modifier.height(24.dp))
                    if (weeklyChartData.values.isNotEmpty()) {
                        EarningsGraph(data = weeklyChartData.values)
                    }

                    Spacer(modifier = Modifier.height(32.dp))
                    TzirButton(
                        text = stringResource(com.tzir.delivery.courier.R.string.delivery_history),
                        onClick = onShowHistory,
                        modifier = Modifier.fillMaxWidth().height(64.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun StatMiniItem(label: String, value: String) {
    Column {
        Text(label, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Text(value, color = MaterialTheme.colorScheme.onSurface, fontSize = 18.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
fun EarningsSectionCard(label: String, value: String, accentColor: Color, modifier: Modifier = Modifier) {
    GlassCard(
        modifier = modifier.height(110.dp),
        cornerRadius = 20.dp
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(accentColor.copy(alpha = 1f), CircleShape)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(label, color = TextGray, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            Text(value, color = TextOfficial, fontSize = 22.sp, fontWeight = FontWeight.Black)
        }
    }
}

@Composable
fun EarningsGraph(data: List<Float>) {
    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .height(200.dp),
        cornerRadius = 24.dp
    ) {
        Box(modifier = Modifier.padding(24.dp)) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val width = size.width
                val height = size.height
                val maxVal = data.maxOrNull() ?: 1f
                val stepX = width / (data.size - 1)
                
                val path = Path()
                data.forEachIndexed { index, value ->
                    val x = index * stepX
                    val y = height - (value / maxVal * height)
                    if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
                }
                
                drawPath(
                    path = path,
                    brush = Brush.verticalGradient(
                        colors = listOf(BrandBlue, TextOfficial)
                    ),
                    style = Stroke(width = 4.dp.toPx(), cap = androidx.compose.ui.graphics.StrokeCap.Round)
                )
                
                // Draw dots
                data.forEachIndexed { index, value ->
                    val x = index * stepX
                    val y = height - (value / maxVal * height)
                    drawCircle(
                        Color.White, 
                        radius = 4.dp.toPx(), 
                        center = androidx.compose.ui.geometry.Offset(x, y)
                    )
                    drawCircle(
                        BrandBlue, 
                        radius = 3.dp.toPx(), 
                        center = androidx.compose.ui.geometry.Offset(x, y),
                        style = Stroke(width = 2.dp.toPx())
                    )
                }
            }
        }
    }
}

@Composable
fun KpiCard(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Card(modifier = modifier.height(84.dp), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.08f)), elevation = CardDefaults.cardElevation(0.dp)) {
        Column(modifier = Modifier.fillMaxSize().padding(12.dp), verticalArrangement = Arrangement.SpaceBetween) {
            Text(label, fontSize = 11.sp, color = TextGray, fontWeight = FontWeight.Bold)
            Text(value, fontSize = 22.sp, fontWeight = FontWeight.Black, color = color)
        }
    }
}

@Composable
fun WeekCompareItem(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, fontSize = 11.sp, color = TextGray)
        Spacer(Modifier.height(4.dp))
        Text(value, fontWeight = FontWeight.Black, fontSize = 16.sp, color = color)
    }
}

@Composable
fun ForecastCard(forecast: Double, progress: Float, daysLeft: Int) {
    GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 20.dp) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("תחזית לסוף החודש", fontSize = 12.sp, color = TextGray, fontWeight = FontWeight.Bold)
                    Text("₪${String.format("%.0f", forecast)}", fontSize = 28.sp, fontWeight = FontWeight.Black, color = TextOfficial)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("נותרו ימים", fontSize = 12.sp, color = TextGray)
                    Text("$daysLeft", fontSize = 28.sp, fontWeight = FontWeight.Black, color = com.tzir.delivery.courier.ui.theme.BrandBlue)
                }
            }
            Spacer(Modifier.height(12.dp))
            LinearProgressIndicator(modifier = Modifier.fillMaxWidth().height(8.dp), progress = { progress }, color = com.tzir.delivery.courier.ui.theme.BrandBlue, trackColor = Color.LightGray, strokeCap = androidx.compose.ui.graphics.StrokeCap.Round)
            Spacer(Modifier.height(6.dp))
            Text("${(progress * 100).toInt()}פ מהחודש עבר", fontSize = 11.sp, color = TextGray)
        }
    }
}

@Composable
fun PeakHoursPanel() {
    val hours = listOf(
        Triple("07:00–09:00", 85, Color(0xFF10B981)),
        Triple("12:00–14:00", 92, Color(0xFF10B981)),
        Triple("17:00–20:00", 98, Color(0xFFF59E0B)),
        Triple("20:00–22:00", 70, Color(0xFF3B82F6))
    )
    GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 20.dp) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("בשעות אלו סטטיסטית יש יותר בקשות באזור שלך:", fontSize = 12.sp, color = TextGray)
            hours.forEach { (time, pct, color) ->
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(time, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(110.dp), color = TextOfficial)
                    LinearProgressIndicator(modifier = Modifier.weight(1f).height(8.dp), progress = { pct / 100f }, color = color, trackColor = Color.LightGray, strokeCap = androidx.compose.ui.graphics.StrokeCap.Round)
                    Spacer(Modifier.width(8.dp))
                    Text("$pct%", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = color)
                }
            }
        }
    }
}

@Composable
fun PersonalGoalCard(currentEarnings: Double) {
    var goalTarget by remember { mutableStateOf(8000) }
    val progress = (currentEarnings / goalTarget).coerceAtMost(1.0).toFloat()
    GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 20.dp) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("יעד חודשי", fontSize = 12.sp, color = TextGray, fontWeight = FontWeight.Bold)
                    Text("₪${String.format("%.0f", currentEarnings)} / ₪$goalTarget", fontSize = 20.sp, fontWeight = FontWeight.Black, color = TextOfficial)
                }
                Row {
                    IconButton(onClick = { if (goalTarget > 1000) goalTarget -= 500 }, modifier = Modifier.size(32.dp)) { Text("-", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextGray) }
                    IconButton(onClick = { goalTarget += 500 }, modifier = Modifier.size(32.dp)) { Text("+", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = BrandBlue) }
                }
            }
            Spacer(Modifier.height(12.dp))
            LinearProgressIndicator(modifier = Modifier.fillMaxWidth().height(10.dp), progress = { progress }, color = if (progress >= 1f) Color(0xFF10B981) else BrandBlue, trackColor = Color.LightGray, strokeCap = androidx.compose.ui.graphics.StrokeCap.Round)
            Spacer(Modifier.height(6.dp))
            Text(if (progress >= 1f) "🎉 הגעת ליעד!" else "${(progress * 100).toInt()}פ מהיעד", fontSize = 12.sp, color = if (progress >= 1f) Color(0xFF10B981) else TextGray)
        }
    }
}
