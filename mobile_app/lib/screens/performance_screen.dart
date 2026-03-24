import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../models/user.dart';
import '../models/performance.dart';
import '../services/performance_service.dart';
import 'performance_detail_screen.dart';

class PerformanceScreen extends StatefulWidget {
  final User user;

  const PerformanceScreen({Key? key, required this.user}) : super(key: key);

  @override
  _PerformanceScreenState createState() => _PerformanceScreenState();
}

class _PerformanceScreenState extends State<PerformanceScreen> with SingleTickerProviderStateMixin {
  final PerformanceService _performanceService = PerformanceService();
  
  bool _isLoading = true;
  List<Performance> _studentRecords = [];
  List<CoursePerformanceSummary> _summaryRecords = [];

  // Tab controller for Admin
  TabController? _tabController;

  bool get _isAdminOrTeacher => 
      widget.user.role == 'college_admin' || 
      widget.user.role == 'system_admin' || 
      widget.user.role == 'teacher';

  @override
  void initState() {
    super.initState();
    if (_isAdminOrTeacher) {
      _tabController = TabController(length: 2, vsync: this);
    }
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    
    final String clientId = widget.user.clientId;

    try {
      if (_isAdminOrTeacher) {
        final records = await _performanceService.getPerformanceSummary(clientId);
        if (mounted) {
          setState(() {
            _summaryRecords = records;
            _isLoading = false;
          });
        }
      } else {
        final records = await _performanceService.getStudentPerformance(widget.user.id, clientId);
        if (mounted) {
          setState(() {
            _studentRecords = records;
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error loading performance data: \$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: _isAdminOrTeacher 
        ? AppBar(
            backgroundColor: Colors.white,
            elevation: 0,
            toolbarHeight: 0, // Hide main app bar text, let the layout handle it
            bottom: TabBar(
              controller: _tabController,
              labelColor: Colors.indigo,
              unselectedLabelColor: Colors.grey,
              indicatorColor: Colors.indigo,
              tabs: const [
                Tab(icon: Icon(Icons.bar_chart), text: 'Summary'),
                Tab(icon: Icon(Icons.upload_file), text: 'Bulk Upload'),
              ],
            ),
          ) 
        : null, // Students just see the body directly
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : _isAdminOrTeacher 
            ? TabBarView(
                controller: _tabController,
                children: [
                  _buildAdminSummaryView(),
                  _buildAdminUploadView(),
                ],
              )
            : _buildStudentView(),
    );
  }

  // ===========================================================================
  // STUDENT VIEW 
  // ===========================================================================

  Widget _buildStudentView() {
    if (_studentRecords.isEmpty) {
      return const Center(
        child: Text('No performance records available yet.', style: TextStyle(color: Colors.grey, fontSize: 16)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _studentRecords.length,
      itemBuilder: (context, index) {
        final perf = _studentRecords[index];
        final double percentage = perf.maxScore > 0 ? (perf.score / perf.maxScore) * 100 : 0;
        final Color pctColor = percentage >= 80 ? Colors.green : (percentage >= 60 ? Colors.orange : Colors.red);

        return Card(
          elevation: 0,
          margin: const EdgeInsets.only(bottom: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.grey.shade200),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(perf.assessmentName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                          const SizedBox(height: 4),
                          Text('Course ID: \${perf.courseId}', style: const TextStyle(color: Colors.indigo, fontSize: 12, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    Icon(Icons.workspace_premium, color: pctColor, size: 32),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Flexible(
                      child: Text(
                        perf.score.toStringAsFixed(1), 
                        style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, height: 1.0),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text('/ \${perf.maxScore}', style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.bold, height: 1.5)),
                  ],
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: percentage / 100,
                    minHeight: 12,
                    backgroundColor: Colors.grey.shade200,
                    color: pctColor,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ===========================================================================
  // ADMIN VIEW - SUMMARY CARDS
  // ===========================================================================

  Widget _buildAdminSummaryView() {
    if (_summaryRecords.isEmpty) {
      return const Center(
        child: Text('No performance summary data available.', style: TextStyle(color: Colors.grey, fontSize: 16)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _summaryRecords.length,
      itemBuilder: (context, index) {
        final summary = _summaryRecords[index];
        final pct = summary.averageScore;
        final Color pctColor = pct >= 75 ? Colors.green : (pct >= 50 ? Colors.orange : Colors.red);

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
                  builder: (context) => PerformanceDetailScreen(
                    user: widget.user,
                    courseId: summary.courseId,
                    className: summary.className ?? 'Unassigned',
                    courseName: summary.courseName,
                  ),
                ),
              );
            },
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Stack(
                children: [
                   Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: Colors.indigo.shade50, borderRadius: BorderRadius.circular(8)),
                        child: Text(
                          summary.className?.toUpperCase() ?? 'UNASSIGNED',
                          style: TextStyle(color: Colors.indigo.shade700, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(summary.courseName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.people, size: 16, color: Colors.grey),
                          const SizedBox(width: 4),
                          Text('Tested: \${summary.studentCount} / Enrolled: \${summary.enrolledStudents}', style: const TextStyle(color: Colors.grey, fontSize: 13)),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Text('Average Score', style: TextStyle(color: Colors.grey, fontSize: 12)),
                      Text(
                        summary.averageScore.toStringAsFixed(1),
                        style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: pctColor),
                      ),
                    ],
                  ),
                  const Positioned(
                    right: 0,
                    bottom: 0,
                    child: Icon(Icons.menu_book, color: Colors.black12, size: 64),
                  )
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ===========================================================================
  // ADMIN VIEW - BULK UPLOAD
  // ===========================================================================

  PlatformFile? _selectedFile;
  bool _isUploading = false;
  String? _uploadMessage;

  Future<void> _pickFile() async {
    FilePickerResult? result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['csv'],
    );

    if (result != null) {
      setState(() {
        _selectedFile = result.files.first;
        _uploadMessage = null; // Clear previous results
      });
    }
  }

  Future<void> _uploadFile() async {
    if (_selectedFile == null) return;

    setState(() => _isUploading = true);

    if (_selectedFile!.path == null) {
       ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('File selection not supported on this platform currently')));
       setState(() => _isUploading = false);
       return;
    }

    final result = await _performanceService.uploadBulkCsv(_selectedFile!.path!, widget.user.clientId);

    if (mounted) {
      setState(() {
        _isUploading = false;
        if (result != null) {
            _uploadMessage = "Success! CSV processed.";
            _fetchData(); // refresh the background list
        } else {
            _uploadMessage = "Failed to upload file.";
        }
      });
    }
  }

  Widget _buildAdminUploadView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Icon(Icons.cloud_upload, size: 64, color: Colors.indigo),
          const SizedBox(height: 16),
          const Text('Bulk Import Scores', textAlign: TextAlign.center, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text(
            'Upload a CSV file containing admission_id, course_title, assessment_name, score, and max_score.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 32),

          InkWell(
            onTap: _pickFile,
            child: Container(
              height: 120,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.indigo.withOpacity(0.5), width: 2, style: BorderStyle.none),
                borderRadius: BorderRadius.circular(16),
                color: Colors.indigo.withOpacity(0.05),
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.folder_open, color: Colors.indigo.shade300, size: 40),
                    const SizedBox(height: 8),
                    Text(
                      _selectedFile?.name ?? 'Tap to select CSV file',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.indigo),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          
          ElevatedButton(
            onPressed: (_selectedFile == null || _isUploading) ? null : _uploadFile,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              backgroundColor: Colors.indigo,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: _isUploading
                ? const Row(mainAxisAlignment: MainAxisAlignment.center, children: [CircularProgressIndicator(color: Colors.white), SizedBox(width: 16), Text('Uploading...')])
                : const Text('UPLOAD GRADES', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
          ),

          if (_uploadMessage != null) ...[
            const SizedBox(height: 32),
             Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _uploadMessage!.contains('Success') ? Colors.green.shade50 : Colors.red.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _uploadMessage!.contains('Success') ? Colors.green.shade200 : Colors.red.shade200),
              ),
              child: Row(
                children: [
                  Icon(_uploadMessage!.contains('Success') ? Icons.check_circle : Icons.error, 
                       color: _uploadMessage!.contains('Success') ? Colors.green : Colors.red),
                  const SizedBox(width: 12),
                  Expanded(child: Text(_uploadMessage!, style: TextStyle(fontWeight: FontWeight.bold, color: _uploadMessage!.contains('Success') ? Colors.green.shade700 : Colors.red.shade700))),
                ],
              ),
            )
          ]
        ],
      ),
    );
  }
}
