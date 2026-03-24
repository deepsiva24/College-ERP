import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';
import '../models/attendance.dart';
import '../services/attendance_service.dart';

class StudentAttendanceCalendarScreen extends StatefulWidget {
  final int userId;
  final String clientId;
  final String studentName;

  const StudentAttendanceCalendarScreen({
    Key? key,
    required this.userId,
    required this.clientId,
    required this.studentName,
  }) : super(key: key);

  @override
  _StudentAttendanceCalendarScreenState createState() => _StudentAttendanceCalendarScreenState();
}

class _StudentAttendanceCalendarScreenState extends State<StudentAttendanceCalendarScreen> {
  final AttendanceService _service = AttendanceService();
  CalendarFormat _calendarFormat = CalendarFormat.month;
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;
  
  Map<String, String> _attendanceMap = {};
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchAttendance();
  }

  Future<void> _fetchAttendance() async {
    setState(() => _isLoading = true);
    try {
      final response = await _service.getStudentAttendanceDetailed(widget.userId, widget.clientId);
      
      if (response.statusCode == 200) {
        final List<dynamic> recordsData = jsonDecode(response.body);
        final Map<String, String> newMap = {};
        
        for (var json in recordsData) {
          final record = Attendance.fromJson(json);
          String dateKey = record.date;
          if (dateKey.contains('T')) {
            dateKey = dateKey.split('T')[0];
          } else if (dateKey.contains(' ')) {
            dateKey = dateKey.split(' ')[0];
          }
          newMap[dateKey] = record.status;
        }

        if (mounted) {
          setState(() {
            _attendanceMap = newMap;
            _isLoading = false;
          });
        }
      } else {
        if (mounted) {
          setState(() => _isLoading = false);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading calendar: $e')),
        );
      }
    }
  }

  MaterialColor _getStatusColor(String? status) {
    if (status == null) return Colors.grey;
    final s = status.toLowerCase();
    switch (s) {
      case 'present': return Colors.green;
      case 'absent': return Colors.red;
      case 'late': return Colors.orange;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.studentName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.blueGrey)),
            const Text('Attendance History', style: TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.blueGrey),
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : Column(
            children: [
              _buildSummaryRow(),
              const Divider(height: 1),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      TableCalendar(
                        firstDay: DateTime.utc(2020, 1, 1),
                        lastDay: DateTime.utc(2030, 12, 31),
                        focusedDay: _focusedDay,
                        calendarFormat: _calendarFormat,
                        selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
                        onDaySelected: (selectedDay, focusedDay) {
                          setState(() {
                            _selectedDay = selectedDay;
                            _focusedDay = focusedDay;
                          });
                        },
                        onFormatChanged: (format) {
                          setState(() => _calendarFormat = format);
                        },
                        onPageChanged: (focusedDay) {
                          _focusedDay = focusedDay;
                        },
                        calendarStyle: const CalendarStyle(
                          outsideDaysVisible: false,
                          todayDecoration: BoxDecoration(color: Colors.indigoAccent, shape: BoxShape.circle),
                          selectedDecoration: BoxDecoration(color: Colors.indigo, shape: BoxShape.circle),
                        ),
                        calendarBuilders: CalendarBuilders(
                          defaultBuilder: (context, day, focusedDay) {
                            // Standardize YYYY-MM-DD for mapping
                            final dateKey = "${day.year}-${day.month.toString().padLeft(2, '0')}-${day.day.toString().padLeft(2, '0')}";
                            final status = _attendanceMap[dateKey];
                            if (status != null) {
                              final MaterialColor color = _getStatusColor(status);
                              return Center(
                                child: Container(
                                  width: 35,
                                  height: 35,
                                  decoration: BoxDecoration(
                                    color: color.withOpacity(0.15),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: color.withOpacity(0.5), width: 1),
                                  ),
                                  child: Center(
                                    child: Text(
                                      '${day.day}',
                                      style: TextStyle(color: color.shade900, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ),
                              );
                            }
                            return null;
                          },
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildLegend(),
                    ],
                  ),
                ),
              ),
            ],
          ),
    );
  }

  Widget _buildSummaryRow() {
    int p = _attendanceMap.values.where((v) => v.toLowerCase() == 'present').length;
    int a = _attendanceMap.values.where((v) => v.toLowerCase() == 'absent').length;
    int l = _attendanceMap.values.where((v) => v.toLowerCase() == 'late').length;

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _summaryItem('Present', p, Colors.green),
          _summaryItem('Absent', a, Colors.red),
          _summaryItem('Late', l, Colors.orange),
        ],
      ),
    );
  }

  Widget _summaryItem(String label, int count, Color color) {
    return Column(
      children: [
        Text(count.toString(), style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }

  Widget _buildLegend() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: Column(
        children: [
          Row(
            children: [
              _legendItem(Colors.green, 'Present'),
              const SizedBox(width: 16),
              _legendItem(Colors.red, 'Absent'),
              const SizedBox(width: 16),
              _legendItem(Colors.orange, 'Late'),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Tap a date to see details. Colors represent recorded status from the mobile or web app.',
            style: TextStyle(fontSize: 11, color: Colors.grey),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _legendItem(Color color, String label) {
    return Row(
      children: [
        Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
      ],
    );
  }
}
