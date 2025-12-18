import { useState, useEffect } from 'react';
import {
    TextField,
    Box,
    Typography,
    Grid,
    MenuItem,
    Select,
    FormControl,
    InputLabel
} from '@mui/material';

interface DateTimePicker24hProps {
    label: string;
    value: string; // Format: YYYY-MM-DDTHH:mm
    onChange: (value: string) => void;
    required?: boolean;
    helperText?: string;
    error?: boolean;
    disabled?: boolean;
    min?: string; // Minimum datetime
    max?: string; // Maximum datetime
}

export default function DateTimePicker24h({
    label,
    value,
    onChange,
    required = false,
    helperText,
    error = false,
    disabled = false,
    min,
    max
}: DateTimePicker24hProps) {
    // Parse value: YYYY-MM-DDTHH:mm
    const parseValue = (val: string) => {
        if (!val) return { date: '', hour: '00', minute: '00' };
        const [datePart, timePart] = val.split('T');
        const [hour = '00', minute = '00'] = timePart?.split(':') || [];
        return { date: datePart || '', hour, minute };
    };

    const { date: initialDate, hour: initialHour, minute: initialMinute } = parseValue(value);
    const [date, setDate] = useState(initialDate);
    const [hour, setHour] = useState(initialHour);
    const [minute, setMinute] = useState(initialMinute);

    // Sync with external value changes
    useEffect(() => {
        const parsed = parseValue(value);
        setDate(parsed.date);
        setHour(parsed.hour);
        setMinute(parsed.minute);
    }, [value]);

    // Generate options for hours (0-23) and minutes (0-59, step 1)
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    const updateValue = (newDate: string, newHour: string, newMinute: string) => {
        if (newDate && newHour && newMinute) {
            onChange(`${newDate}T${newHour}:${newMinute}`);
        }
    };

    const handleDateChange = (newDate: string) => {
        setDate(newDate);
        if (newDate) {
            updateValue(newDate, hour, minute);
        }
    };

    const handleHourChange = (newHour: string) => {
        setHour(newHour);
        if (date) {
            updateValue(date, newHour, minute);
        }
    };

    const handleMinuteChange = (newMinute: string) => {
        setMinute(newMinute);
        if (date) {
            updateValue(date, hour, newMinute);
        }
    };

    return (
        <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: error ? 'error.main' : 'text.primary' }}>
                {label} {required && <span style={{ color: 'red' }}>*</span>}
            </Typography>
            
            <Grid container spacing={1}>
                {/* Date Picker */}
                <Grid item xs={12} sm={5}>
                    <TextField
                        fullWidth
                        type="date"
                        value={date}
                        onChange={(e) => handleDateChange(e.target.value)}
                        disabled={disabled}
                        error={error}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{
                            min: min?.split('T')[0],
                            max: max?.split('T')[0]
                        }}
                        sx={{
                            '& input[type="date"]::-webkit-calendar-picker-indicator': {
                                cursor: 'pointer',
                            }
                        }}
                    />
                </Grid>

                {/* Time Picker - Hour */}
                <Grid item xs={4} sm={2.5}>
                    <FormControl fullWidth error={error} disabled={disabled}>
                        <InputLabel shrink>Hour</InputLabel>
                        <Select
                            value={hour}
                            onChange={(e) => handleHourChange(e.target.value)}
                            label="Hour"
                            displayEmpty
                        >
                            {hours.map((h) => (
                                <MenuItem key={h} value={h}>
                                    {h}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Time Picker - Minute */}
                <Grid item xs={4} sm={2.5}>
                    <FormControl fullWidth error={error} disabled={disabled}>
                        <InputLabel shrink>Minute</InputLabel>
                        <Select
                            value={minute}
                            onChange={(e) => handleMinuteChange(e.target.value)}
                            label="Minute"
                            displayEmpty
                        >
                            {minutes.map((m) => (
                                <MenuItem key={m} value={m}>
                                    {m}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Format indicator */}
                <Grid item xs={4} sm={2}>
                    <Box
                        sx={{
                            height: '56px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'grey.100',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: error ? 'error.main' : 'divider'
                        }}
                    >
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                            24h
                        </Typography>
                    </Box>
                </Grid>
            </Grid>

            {helperText && (
                <Typography variant="caption" color={error ? 'error' : 'text.secondary'} sx={{ mt: 0.5, display: 'block' }}>
                    {helperText}
                </Typography>
            )}
        </Box>
    );
}
