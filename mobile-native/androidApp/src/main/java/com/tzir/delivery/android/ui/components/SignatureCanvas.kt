
package com.tzir.delivery.android.ui.components

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.view.MotionEvent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInteropFilter
import androidx.compose.ui.unit.dp
import androidx.compose.ui.ExperimentalComposeUiApi

@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun SignatureCanvas(onBitmapCaptured: (Bitmap) -> Unit) {
    var path by remember { mutableStateOf(androidx.compose.ui.graphics.Path()) }
    val drawPath = remember { android.graphics.Path() } // Android graphics Path for bitmap drawing
    
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxWidth()
            .height(200.dp)
            .background(Color.White, RoundedCornerShape(8.dp))
    ) {
        val width = constraints.maxWidth.toFloat()
        val height = constraints.maxHeight.toFloat()
        
        val bitmap = remember { Bitmap.createBitmap(width.toInt(), height.toInt(), Bitmap.Config.ARGB_8888) }
        val canvas = remember { Canvas(bitmap) }
        val paint = remember { 
            Paint().apply {
                color = android.graphics.Color.BLACK
                style = Paint.Style.STROKE
                strokeWidth = 10f
                strokeCap = Paint.Cap.ROUND
                isAntiAlias = true
            }
        }

        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .pointerInteropFilter {
                    when (it.action) {
                        MotionEvent.ACTION_DOWN -> {
                            path.moveTo(it.x, it.y)
                            drawPath.moveTo(it.x, it.y)
                        }
                        MotionEvent.ACTION_MOVE -> {
                            path.lineTo(it.x, it.y)
                            drawPath.lineTo(it.x, it.y)
                            canvas.drawPath(drawPath, paint)
                            onBitmapCaptured(bitmap)
                        }
                    }
                    true
                }
        ) {
            drawPath(
                path = path,
                color = Color.Black,
                style = Stroke(width = 4f, cap = StrokeCap.Round)
            )
        }
    }
}
