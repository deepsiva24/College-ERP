import 'package:flutter/material.dart';
import '../models/attendance.dart';
import 'student_attendance_calendar_screen.dart';

class ClassAttendanceDetailScreen extends StatelessWidget {
  final String className;
  final String clientId;
  final List<AttendanceSummaryRecord> records;

  const ClassAttendanceDetailScreen({
    Key? key,
    required this.className,
    required this.clientId,
    required this.records,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Text('Details: $className', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey, fontSize: 18)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.blueGrey),
      ),
      body: records.isEmpty
          ? const Center(child: Text('No student records found.', style: TextStyle(color: Colors.grey)))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: records.length,
              itemBuilder: (context, index) {
                final record = records[index];
                final totalDays = record.totalPresent + record.totalAbsent + record.totalLate;
                final percentage = totalDays > 0 ? (record.totalPresent / totalDays) * 100 : 0.0;
                final pctColor = percentage >= 75 ? Colors.green : (percentage >= 60 ? Colors.orange : Colors.red);

                return Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Colors.grey.shade200),
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => StudentAttendanceCalendarScreen(
                            userId: record.userId,
                            clientId: clientId,
                            studentName: '${record.firstName} ${record.lastName}',
                          ),
                        ),
                      );
                    },
                    leading: CircleAvatar(
                      backgroundColor: Colors.indigo.shade50,
                      child: Text(
                        record.firstName.isNotEmpty ? record.firstName.substring(0, 1).toUpperCase() : '?',
                        style: TextStyle(color: Colors.indigo.shade700, fontWeight: FontWeight.bold),
                      ),
                    ),
                    title: Text('${record.firstName} ${record.lastName}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 4.0),
                      child: Text(
                        'P: ${record.totalPresent}  •  A: ${record.totalAbsent}  •  L: ${record.totalLate}', 
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: pctColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: pctColor.withOpacity(0.3)),
                      ),
                      child: Text(
                        '${percentage.toStringAsFixed(1)}%',
                        style: TextStyle(color: pctColor, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }
}
