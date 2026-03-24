import 'package:flutter/material.dart';
import '../models/user.dart';
import '../models/performance.dart';
import '../services/performance_service.dart';

class PerformanceDetailScreen extends StatefulWidget {
  final User user;
  final int courseId;
  final String className;
  final String courseName;

  const PerformanceDetailScreen({
    Key? key,
    required this.user,
    required this.courseId,
    required this.className,
    required this.courseName,
  }) : super(key: key);

  @override
  _PerformanceDetailScreenState createState() => _PerformanceDetailScreenState();
}

class _PerformanceDetailScreenState extends State<PerformanceDetailScreen> {
  final PerformanceService _service = PerformanceService();
  bool _isLoading = true;
  List<StudentPerformanceDetail> _records = [];
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _fetchDetails();
  }

  Future<void> _fetchDetails() async {
    setState(() => _isLoading = true);
    try {
      final records = await _service.getPerformanceDetails(widget.courseId, widget.className, widget.user.clientId);
      if (mounted) {
        setState(() {
          _records = records;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error loading details: \$e')));
      }
    }
  }

  List<StudentPerformanceDetail> get _filteredRecords {
    if (_searchQuery.isEmpty) return _records;
    final query = _searchQuery.toLowerCase();
    return _records.where((r) {
      final fullName = '\${r.firstName} \${r.lastName}'.toLowerCase();
      final admissionId = (r.admissionId ?? '').toLowerCase();
      return fullName.contains(query) || admissionId.contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.courseName, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey, fontSize: 18)),
            Text(widget.className, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey, fontSize: 12)),
          ],
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.blueGrey),
      ),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search by Name or Admission ID...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
              ),
              onChanged: (val) {
                setState(() => _searchQuery = val);
              },
            ),
          ),
          Expanded(
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator())
              : _filteredRecords.isEmpty
                  ? const Center(child: Text('No student records found.', style: TextStyle(color: Colors.grey)))
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _filteredRecords.length,
                      itemBuilder: (context, index) {
                        final record = _filteredRecords[index];
                        final pct = record.maxScore > 0 ? (record.score / record.maxScore) * 100 : 0;
                        final Color pctColor = pct >= 75 ? Colors.green : (pct >= 50 ? Colors.orange : Colors.red);

                        return Card(
                          elevation: 0,
                          margin: const EdgeInsets.only(bottom: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: BorderSide(color: Colors.grey.shade200),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        '\${record.firstName} \${record.lastName}',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)),
                                      child: Text(record.admissionId ?? 'N/A', style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(record.assessmentName, style: const TextStyle(color: Colors.grey, fontSize: 13), overflow: TextOverflow.ellipsis),
                                          const SizedBox(height: 4),
                                          Row(
                                            children: [
                                              Flexible(child: Text('\${record.score.toStringAsFixed(1)} ', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.indigo), overflow: TextOverflow.ellipsis)),
                                              Text('/ \${record.maxScore}', style: const TextStyle(color: Colors.grey)),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                      decoration: BoxDecoration(
                                        color: pctColor.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Text(
                                        '\${pct.toStringAsFixed(1)}%',
                                        style: TextStyle(color: pctColor, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
          ),
        ],
      ),
    );
  }
}
