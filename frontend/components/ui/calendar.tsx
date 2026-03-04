"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-2 font-sans", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 text-slate-100 font-sans",
                month: "space-y-4 font-sans",
                month_caption: "flex justify-center pt-1 relative items-center text-slate-100",
                caption_label: "text-sm font-medium text-slate-100",
                nav: "space-x-1 flex items-center",
                button_previous: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 border-slate-700 hover:bg-slate-800 text-slate-300 absolute left-1 flex items-center justify-center rounded-md transition-colors"
                ),
                button_next: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 border-slate-700 hover:bg-slate-800 text-slate-300 absolute right-1 flex items-center justify-center rounded-md transition-colors"
                ),
                month_grid: "w-full border-collapse space-y-1",
                weekdays: "flex",
                weekday: "text-slate-400 rounded-md w-8 font-medium text-[0.8rem] text-center",
                week: "flex w-full mt-2",
                day: "h-8 w-8 text-center text-sm p-0 m-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-slate-800/10 [&:has([aria-selected])]:bg-slate-800 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-8 w-8 p-0 font-medium text-slate-200 hover:bg-slate-800 hover:text-white rounded-md transition-colors flex items-center justify-center"
                ),
                range_end: "day-range-end",
                selected:
                    "bg-blue-600 text-white hover:bg-blue-500 hover:text-white focus:bg-blue-600 focus:text-white rounded-md",
                today: "bg-slate-800 text-white font-bold rounded-md ring-1 ring-slate-600 ring-offset-1 ring-offset-transparent",
                outside: "day-outside text-slate-500 opacity-50 aria-selected:bg-slate-800/50 aria-selected:text-slate-500 aria-selected:opacity-30",
                disabled: "text-slate-500 opacity-50",
                range_middle: "aria-selected:bg-slate-800 aria-selected:text-slate-100",
                hidden: "invisible",
                chevron: "w-4 h-4 fill-slate-300",
                ...classNames,
            }}
            components={{
                Chevron: (props) => {
                    if (props.orientation === 'left') {
                        return <ChevronLeft className="w-4 h-4 text-slate-300" />;
                    }
                    return <ChevronRight className="w-4 h-4 text-slate-300" />;
                },
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
