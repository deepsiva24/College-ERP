import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../models/user.dart';
import '../models/record_attendance.dart';
import '../services/attendance_service.dart';
import 'live_roster_screen.dart';

class RecordAttendanceScreen extends StatefulWidget {
  final User user;

  const RecordAttendanceScreen({Key? key, required this.user}) : super(key: key);

  @override
  _RecordAttendanceScreenState createState() => _RecordAttendanceScreenState();
}

class _RecordAttendanceScreenState extends State<RecordAttendanceScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final AttendanceService _service = AttendanceService();

  // --- Flashcard State ---
  bool _isLoadingClasses = true;
  List<ClassSectionInfo> _classes = [];
  String? _selectedClass;
  String? _selectedSection;
  String _attendanceDate = DateTime.now().toIso8601String().split('T')[0];
  
  bool _isFetchingStudents = false;

  // --- Bulk Upload State ---
  PlatformFile? _selectedFile;
  bool _isUploading = false;
  BulkUploadResult? _uploadResult;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchClasses();
  }

  Future<void> _fetchClasses() async {
    final classes = await _service.getClasses(widget.user.clientId);
    if (mounted) {
      setState(() {
        _classes = classes;
        _isLoadingClasses = false;
      });
    }
  }

  // Derived lists for dropdowns
  List<String> get uniqueClassNames => _classes.map((c) => c.className).toSet().toList();
  List<String> get availableSections => _classes
      .where((c) => c.className == _selectedClass)
      .map((c) => c.section)
      .toList();

  Future<void> _loadRoster() async {
    if (_selectedClass == null || _selectedSection == null) return;
    
    setState(() {
      _isFetchingStudents = true;
    });

    final students = await _service.getStudentsByClass(_selectedClass!, _selectedSection!, widget.user.clientId);
    
    if (mounted) {
      setState(() {
        _isFetchingStudents = false;
      });
      
      if (students.isNotEmpty) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => LiveRosterScreen(
              user: widget.user,
              className: _selectedClass!,
              section: _selectedSection!,
              date: _attendanceDate,
              students: students,
            ),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No students found in this roster.')),
        );
      }
    }
  }

  // Flashcard recording moved to LiveRosterScreen

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Record Attendance', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey)),
        backgroundColor: Colors.white,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.indigo,
          unselectedLabelColor: Colors.grey,
          indicatorColor: Colors.indigo,
          tabs: const [
            Tab(icon: Icon(Icons.people), text: 'Live Record'),
            Tab(icon: Icon(Icons.upload_file), text: 'Bulk Upload'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildFlashcardTab(),
          _buildBulkUploadTab(),
        ],
      ),
    );
  }

  // =========================================================================
  // FLASHCARD TAB
  // =========================================================================

  Widget _buildFlashcardTab() {
    if (_isLoadingClasses) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      children: [
        _buildFiltersSection(),
        Expanded(
          child: _buildEmptyState(),
        ),
      ],
    );
  }

  Widget _buildFiltersSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.grey.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        children: [
          DropdownButtonFormField<String>(
            decoration: const InputDecoration(labelText: 'Class/Degree', border: OutlineInputBorder()),
            value: _selectedClass,
            items: uniqueClassNames.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
            onChanged: (val) {
              setState(() {
                _selectedClass = val;
                _selectedSection = null; // reset section
              });
            },
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            decoration: const InputDecoration(labelText: 'Section', border: OutlineInputBorder()),
            value: _selectedSection,
            items: availableSections.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
            onChanged: _selectedClass == null ? null : (val) {
              setState(() {
                _selectedSection = val;
              });
            },
            disabledHint: const Text('Select Class first'),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton.icon(
              onPressed: (_selectedClass == null || _selectedSection == null || _isFetchingStudents) 
                  ? null 
                  : _loadRoster,
              icon: _isFetchingStudents ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Icon(Icons.download, color: Colors.white),
              label: const Text('LOAD ROSTER', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.indigo,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return const Center(
      child: Text('Select a class and load roster to begin.', style: TextStyle(color: Colors.grey)),
    );
  }

  // Flashcard methods moved to LiveRosterScreen

  // =========================================================================
  // BULK UPLOAD TAB
  // =========================================================================

  Future<void> _pickFile() async {
    FilePickerResult? result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['csv'],
    );

    if (result != null) {
      setState(() {
        _selectedFile = result.files.first;
        _uploadResult = null; // Clear previous results
      });
    }
  }

  Future<void> _uploadFile() async {
    if (_selectedFile == null) return;

    setState(() => _isUploading = true);

    // Using path for Android/iOS, or bytes for Web.
    // Assuming native mobile or desktop path exists for now. Web needs bytes modification.
    if (_selectedFile!.path == null) {
       ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('File selection not supported on this platform currently')));
       setState(() => _isUploading = false);
       return;
    }

    final result = await _service.uploadBulkCsv(_selectedFile!.path!, widget.user.clientId);

    if (mounted) {
      setState(() {
        _isUploading = false;
        _uploadResult = result;
      });
      if (result == null) {
         ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Upload failed')));
      }
    }
  }

  Widget _buildBulkUploadTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Icon(Icons.upload_file, size: 64, color: Colors.indigo),
          const SizedBox(height: 16),
          const Text('Upload CSV Roster', textAlign: TextAlign.center, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text(
            'Upload a CSV file containing admission_id, date (YYYY-MM-DD), and status (Present/Absent/Late).',
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
                : const Text('UPLOAD FULL ROSTER', style: TextStyle(fontWeight: FontWeight.bold)),
          ),

          if (_uploadResult != null) _buildUploadResult(),
        ],
      ),
    );
  }

  Widget _buildUploadResult() {
    return Container(
      margin: const EdgeInsets.only(top: 32),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.green.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.green.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.green),
              const SizedBox(width: 8),
              const Text('Upload Successful', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.green)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              Expanded(child: _statBox('${_uploadResult!.added}', 'Added', Colors.green)),
              const SizedBox(width: 8),
              Expanded(child: _statBox('${_uploadResult!.updated}', 'Updated', Colors.blue)),
            ],
          ),
          if (_uploadResult!.errors.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Divider(),
            const Text('Warnings:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange)),
            const SizedBox(height: 8),
            Container(
              height: 100,
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
              child: ListView.builder(
                itemCount: _uploadResult!.errors.length,
                itemBuilder: (ctx, i) => Text('• ${_uploadResult!.errors[i]}', style: const TextStyle(fontSize: 12, color: Colors.red)),
              ),
            ),
          ]
        ],
      ),
    );
  }

  Widget _statBox(String value, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), boxShadow: [BoxShadow(color: color.withOpacity(0.1), blurRadius: 4)]),
      child: Column(
        children: [
          Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
