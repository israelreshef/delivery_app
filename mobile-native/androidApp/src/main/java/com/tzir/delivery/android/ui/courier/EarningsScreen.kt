
package com.tzir.delivery.android.ui.courier

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
import com.tzir.delivery.android.R
import com.tzir.delivery.android.ui.components.*
import kotlinx.coroutines.launch

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
fun EarningsScreen(user: com.tzir.delivery.shared.model.User, repository: com.tzir.delivery.shared.repository.CourierRepository, onShowHistory: () -> Unit) {
    val stats by repository.stats.collectAsState()
    val isOffline by repository.isOffline.collectAsState()
    var isLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        if (stats == null) {
            isLoading = true
            repository.refreshStats(user.id.toIntOrNull() ?: 0)
            isLoading = false
        } else {
            repository.refreshStats(user.id.toIntOrNull() ?: 0)
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = Color.Transparent
    ) { scaffoldPadding ->
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(scaffoldPadding)
            .padding(16.dp)
            .verticalScroll(rememberScrollState())
    ) {
        Text(
            text = stringResource(R.string.your_earnings),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = TextOfficial
        )
        
        Spacer(modifier = Modifier.height(24.dp))

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
            OfficialCard(
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
                            stringResource(R.string.total_balance), 
                            color = Color.White.copy(alpha = 0.6f), 
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                        Text(
                            "₪${stats?.balance ?: "0.0"}", 
                            color = Color.White, 
                            fontSize = 48.sp, 
                            fontWeight = FontWeight.Black,
                            letterSpacing = (-1).sp
                        )
                        
                        Spacer(modifier = Modifier.weight(1f))
                        
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            StatMiniItem(stringResource(R.string.total_deliveries), "${stats?.totalDeliveries ?: 0}")
                            StatMiniItem(stringResource(R.string.avg_rating), "⭐ ${stats?.rating ?: 5.0}")
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                EarningsSectionCard(stringResource(R.string.today), "₪${stats?.todayEarnings ?: 0.0}", PrimaryTurquoise.copy(alpha = 0.1f), Modifier.weight(1f))
                EarningsSectionCard(stringResource(R.string.this_week), "₪${stats?.weeklyEarnings ?: 0.0}", TextOfficial.copy(alpha = 0.1f), Modifier.weight(1f))
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            Text(
                text = stringResource(R.string.earnings_trend),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.ExtraBold,
                color = TextOfficial
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            EarningsGraph(data = listOf(150f, 320f, 210f, 450f, 380f, 520f, 480f))
        }

        Spacer(modifier = Modifier.height(32.dp))

        Text(
            text = stringResource(R.string.business_management),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.ExtraBold,
            color = TextOfficial
        )
        
        Spacer(modifier = Modifier.height(20.dp))

        GlassCard(
            modifier = Modifier.fillMaxWidth(),
            cornerRadius = 24.dp
        ) {
            var selectedMonth by remember { mutableStateOf(java.util.Calendar.getInstance().get(java.util.Calendar.MONTH) + 1) }
            val year = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR)

            Column(modifier = Modifier.padding(24.dp)) {
                Text(stringResource(R.string.select_month), color = TextOfficial.copy(alpha = 0.6f), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = { if (selectedMonth > 1) selectedMonth-- },
                        modifier = Modifier.background(TextOfficial.copy(alpha = 0.05f), CircleShape).size(40.dp)
                    ) { Text("‹", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = TextOfficial) }
                    
                    Text(
                        selectedMonth.toString(), 
                        fontWeight = FontWeight.Black, 
                        fontSize = 22.sp,
                        color = TextOfficial
                    )
                    
                    IconButton(
                        onClick = { if (selectedMonth < 12) selectedMonth++ },
                        modifier = Modifier.background(TextOfficial.copy(alpha = 0.05f), CircleShape).size(40.dp)
                    ) { Text("›", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = TextOfficial) }
                    
                    Spacer(modifier = Modifier.weight(1f))

                    TzirButton(
                        text = stringResource(R.string.download_report),
                        onClick = {
                            scope.launch {
                                isLoading = true
                                val bytes = repository.exportEarnings(year, selectedMonth)
                                isLoading = false
                                if (bytes != null && bytes.isNotEmpty()) {
                                    val filename = "earnings_${year}_${selectedMonth}.csv"
                                    val uri = saveEarningsCsv(context, bytes, filename)
                                    if (uri != null) {
                                        snackbarHostState.showSnackbar("✅ הדוח נשמר ב-Downloads")
                                        val shareIntent = Intent(Intent.ACTION_VIEW).apply {
                                            setDataAndType(uri, "text/csv")
                                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                        }
                                        context.startActivity(Intent.createChooser(shareIntent, "פתח דוח"))
                                    } else {
                                        snackbarHostState.showSnackbar("❌ שגיאה בשמירת הקובץ")
                                    }
                                } else {
                                    snackbarHostState.showSnackbar("❌ לא ניתן להוריד את הדוח. בדוק חיבור לשרת.")
                                }
                            }
                        },
                        modifier = Modifier.width(150.dp).height(48.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        TzirButton(
            text = stringResource(R.string.delivery_history),
            onClick = onShowHistory,
            modifier = Modifier.fillMaxWidth().height(64.dp)
        )
    }
    } // end Scaffold
}

@Composable
fun StatMiniItem(label: String, value: String) {
    Column {
        Text(label, color = Color.White.copy(alpha = 0.6f), fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Text(value, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Black)
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
                        colors = listOf(PrimaryTurquoise, TextOfficial)
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
                        PrimaryTurquoise, 
                        radius = 3.dp.toPx(), 
                        center = androidx.compose.ui.geometry.Offset(x, y),
                        style = Stroke(width = 2.dp.toPx())
                    )
                }
            }
        }
    }
}
