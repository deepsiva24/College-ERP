import 'package:flutter/material.dart';
import '../models/user.dart';
import '../models/attendance.dart';
import '../services/attendance_service.dart';
import 'class_attendance_detail_screen.dart';
import 'student_attendance_calendar_screen.dart';

class AttendanceScreen extends StatefulWidget {
  final User user;

  const AttendanceScreen({Key? key, required this.user}) : super(key: key);

  @override
  _AttendanceScreenState createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  final AttendanceService _attendanceService = AttendanceService();
  
  bool _isLoading = true;
  List<Attendance> _studentRecords = [];
  List<AttendanceSummaryRecord> _summaryRecords = [];

  bool get _isAdminOrTeacher => 
      widget.user.role == 'college_admin' || 
      widget.user.role == 'system_admin' || 
      widget.user.role == 'teacher';

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    
    // Safety check: ensure client_id is explicitly passed if available, otherwise fallback.
    // Assuming user model has a clientId or we extract it. The backend currently expects client_id query param.
    // For now we will use 'demo' as a hardcoded fallback if client_id is not on User model.
    // Ideally, the User model should have clientId. We will use a default for this implementation.
    final String clientId = widget.user.clientId;

    if (_isAdminOrTeacher) {
      final records = await _attendanceService.getAttendanceSummary(clientId);
      if (mounted) {
        setState(() {
          _summaryRecords = records;
          _isLoading = false;
        });
      }
    } else {
      final records = await _attendanceService.getStudentAttendance(widget.user.id, clientId);
      if (mounted) {
        setState(() {
          _studentRecords = records;
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return _isAdminOrTeacher ? _buildAdminView() : _buildStudentView();
  }

  // --- Student View --- //
  Widget _buildStudentView() {
    int totalPresent = _studentRecords.where((r) => r.status == 'Present').length;
    int totalAbsent = _studentRecords.where((r) => r.status == 'Absent').length;
    
    return Column(
      children: [
        // Summary Header
        Container(
          padding: const EdgeInsets.all(16.0),
          color: Colors.white,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Expanded(child: _buildStatCard('Present', totalPresent, Colors.green)),
              const SizedBox(width: 12),
              Expanded(child: _buildStatCard('Absent', totalAbsent, Colors.red)),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => StudentAttendanceCalendarScreen(
                      userId: widget.user.id,
                      clientId: widget.user.clientId,
                      studentName: 'My Attendance',
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.calendar_month),
              label: const Text('VIEW CALENDAR HISTORY'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.indigo,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: _studentRecords.isEmpty
              ? const Center(child: Text('No attendance records found.'))
              : ListView.builder(
                  itemCount: _studentRecords.length,
                  itemBuilder: (context, index) {
                    final record = _studentRecords[index];
                    return _buildAttendanceTile(record);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildStatCard(String label, int count, MaterialColor color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      decoration: BoxDecoration(
        color: color.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.shade200),
      ),
      child: Column(
        children: [
          Text(label, style: TextStyle(color: color.shade700, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(count.toString(), style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color.shade900)),
        ],
      ),
    );
  }

  Widget _buildAttendanceTile(Attendance record) {
    Color bgColor;
    Color textColor;
    IconData icon;

    switch (record.status) {
      case 'Present':
        bgColor = Colors.green.shade50;
        textColor = Colors.green.shade700;
        icon = Icons.check_circle;
        break;
      case 'Absent':
        bgColor = Colors.red.shade50;
        textColor = Colors.red.shade700;
        icon = Icons.cancel;
        break;
      case 'Late':
      default:
        bgColor = Colors.yellow.shade50;
        textColor = Colors.yellow.shade800;
        icon = Icons.watch_later;
    }

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: bgColor,
          child: Icon(icon, color: textColor),
        ),
        title: Text(record.date, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: const Text('Daily Record'),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: textColor.withOpacity(0.3)),
          ),
          child: Text(
            record.status.toUpperCase(),
            style: TextStyle(color: textColor, fontWeight: FontWeight.bold, fontSize: 12),
          ),
        ),
      ),
    );
  }

  // --- Admin/Teacher View --- //
  Widget _buildAdminView() {
    // Group by class to match the React web app's first view Level 1
    Map<String, Map<String, dynamic>> classStats = {};
    
    for (var record in _summaryRecords) {
      String className = record.className ?? 'Unassigned';
      if (!classStats.containsKey(className)) {
        classStats[className] = {
          'totalPresent': 0,
          'totalAbsent': 0,
          'totalLate': 0,
          'studentCount': 0,
        };
      }
      classStats[className]!['totalPresent'] += record.totalPresent;
      classStats[className]!['totalAbsent'] += record.totalAbsent;
      classStats[className]!['totalLate'] += record.totalLate;
      classStats[className]!['studentCount'] += 1;
    }

    if (classStats.isEmpty) {
      return const Center(child: Text('No class data available.'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: classStats.length,
      itemBuilder: (context, index) {
        String className = classStats.keys.elementAt(index);
        var stats = classStats[className]!;
        
        int totalDays = stats['totalPresent'] + stats['totalAbsent'] + stats['totalLate'];
        double percentage = totalDays > 0 ? (stats['totalPresent'] / totalDays) * 100 : 0.0;
        
        Color pctColor = percentage >= 75 ? Colors.green : (percentage >= 60 ? Colors.orange : Colors.red);

        return Card(
          elevation: 2,
          margin: const EdgeInsets.only(bottom: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => ClassAttendanceDetailScreen(
                    className: className,
                    clientId: widget.user.clientId,
                    records: _summaryRecords.where((r) => 
                      r.className == className || 
                      (r.className == null && className == 'Unassigned')
                    ).toList(),
                  ),
                ),
              );
            },
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(className, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      Icon(Icons.bar_chart, color: Colors.indigo.shade400),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.people, size: 16, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text('${stats['studentCount']} Students Enrolled', style: const TextStyle(color: Colors.grey)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text('Overall Attendance', style: TextStyle(color: Colors.grey, fontSize: 12)),
                  Text(
                    '${percentage.toStringAsFixed(1)}%',
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: pctColor),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
