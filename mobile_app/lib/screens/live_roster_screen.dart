import 'package:flutter/material.dart';
import '../models/user.dart';
import '../models/record_attendance.dart';
import '../services/attendance_service.dart';

class LiveRosterScreen extends StatefulWidget {
  final User user;
  final String className;
  final String section;
  final String date;
  final List<StudentBasic> students;

  const LiveRosterScreen({
    Key? key,
    required this.user,
    required this.className,
    required this.section,
    required this.date,
    required this.students,
  }) : super(key: key);

  @override
  _LiveRosterScreenState createState() => _LiveRosterScreenState();
}

class _LiveRosterScreenState extends State<LiveRosterScreen> {
  final AttendanceService _service = AttendanceService();
  int _currentIndex = 0;
  bool _isSubmitting = false;

  Future<void> _recordStatus(String status) async {
    if (widget.students.isEmpty || _currentIndex >= widget.students.length || _isSubmitting) return;

    setState(() => _isSubmitting = true);

    final student = widget.students[_currentIndex];
    final success = await _service.recordStatus(student.userId, widget.date, status, widget.user.clientId);

    if (mounted) {
      setState(() {
        _isSubmitting = false;
        if (success) {
          _currentIndex++; // Move to next card
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to record attendance.')),
          );
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Text('${widget.className} - ${widget.section}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.blueGrey),
      ),
      body: widget.students.isEmpty
          ? const Center(child: Text('No students found in this roster.'))
          : _currentIndex < widget.students.length
              ? _buildFlashcard()
              : _buildCompletionState(),
    );
  }

  Widget _buildCompletionState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.check_circle, size: 80, color: Colors.green),
          const SizedBox(height: 16),
          const Text('All Done!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          Text('Attendance recorded for ${widget.students.length} students.', style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Return to Filters'),
          )
        ],
      ),
    );
  }

  Widget _buildFlashcard() {
    final student = widget.students[_currentIndex];
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      child: Column(
        children: [
          // Progress text
          Padding(
            padding: const EdgeInsets.only(bottom: 16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Student ${_currentIndex + 1} of ${widget.students.length}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.indigo)),
                Text('${((_currentIndex / widget.students.length) * 100).toStringAsFixed(0)}% Complete'),
              ],
            ),
          ),
          
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 300),
            child: Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(color: Colors.indigo.withOpacity(0.1), blurRadius: 20, spreadRadius: 5),
                ],
              ),
              child: Center(
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                        decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(16)),
                        child: Text(student.admissionId ?? 'ID Pending', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold)),
                      ),
                      const SizedBox(height: 16),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        child: Text('${student.firstName} ${student.lastName}', 
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Colors.black87),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          
          const Spacer(),
          
          // Action Buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Expanded(child: _actionBtn(Icons.cancel, 'Absent', Colors.red, () => _recordStatus('Absent'))),
              const SizedBox(width: 8),
              Expanded(child: _actionBtn(Icons.watch_later, 'Late', Colors.yellow.shade800, () => _recordStatus('Late'))),
              const SizedBox(width: 8),
              Expanded(child: _actionBtn(Icons.check_circle, 'Present', Colors.green, () => _recordStatus('Present'))),
            ],
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _actionBtn(IconData icon, String label, Color color, VoidCallback onTap) {
    return Opacity(
      opacity: _isSubmitting ? 0.5 : 1.0,
      child: InkWell(
        onTap: _isSubmitting ? null : onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 4),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: color.withOpacity(0.5), width: 2),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: color, size: 28),
              const SizedBox(height: 8),
              Text(label, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13), overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
      ),
    );
  }
}
