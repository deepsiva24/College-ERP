import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../models/user.dart';
import '../models/student.dart';
import '../services/student_service.dart';

class AddStudentScreen extends StatefulWidget {
  final User user;

  const AddStudentScreen({Key? key, required this.user}) : super(key: key);

  @override
  _AddStudentScreenState createState() => _AddStudentScreenState();
}

class _AddStudentScreenState extends State<AddStudentScreen> with SingleTickerProviderStateMixin {
  final StudentService _studentService = StudentService();
  final _formKey = GlobalKey<FormState>();
  
  // Controllers
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController(text: 'Gurukul@123'); // Default password
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _admissionIdController = TextEditingController();
  final _classNameController = TextEditingController();
  final _sectionController = TextEditingController();
  
  TabController? _tabController;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _admissionIdController.dispose();
    _classNameController.dispose();
    _sectionController.dispose();
    _tabController?.dispose();
    super.dispose();
  }

  Future<void> _submitForm() async {
    if (_formKey.currentState!.validate()) {
      setState(() => _isLoading = true);
      
      final student = StudentCreate(
        email: _emailController.text.trim(),
        password: _passwordController.text.trim(),
        firstName: _firstNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        clientId: widget.user.clientId,
        admissionId: _admissionIdController.text.trim(),
        className: _classNameController.text.trim(),
        section: _sectionController.text.trim(),
      );

      final success = await _studentService.createStudent(student);
      
      if (mounted) {
        setState(() => _isLoading = false);
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Student added successfully!'), backgroundColor: Colors.green));
          _formKey.currentState!.reset();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error adding student. Email might be taken.'), backgroundColor: Colors.red));
        }
      }
    }
  }

  Future<void> _handleBulkUpload() async {
    FilePickerResult? result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['csv'],
    );

    if (result != null && result.files.single.path != null) {
      setState(() => _isLoading = true);
      final success = await _studentService.uploadStudentsCsv(result.files.single.path!, widget.user.clientId);
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success ? 'Students imported successfully!' : 'Error importing students.'),
            backgroundColor: success ? Colors.green : Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        toolbarHeight: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.indigo,
          indicatorColor: Colors.indigo,
          tabs: const [
            Tab(icon: Icon(Icons.person_add), text: 'Single Form'),
            Tab(icon: Icon(Icons.group_add), text: 'Bulk CSV'),
          ],
        ),
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : TabBarView(
            controller: _tabController,
            children: [
              _buildSingleFormView(),
              _buildBulkUploadView(),
            ],
          ),
    );
  }

  Widget _buildSingleFormView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildTextField(_firstNameController, 'First Name', Icons.person),
            const SizedBox(height: 16),
            _buildTextField(_lastNameController, 'Last Name', Icons.person_outline),
            const SizedBox(height: 16),
            _buildTextField(_emailController, 'Email Address', Icons.email, keyboardType: TextInputType.emailAddress),
            const SizedBox(height: 16),
            _buildTextField(_admissionIdController, 'Admission ID', Icons.badge),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: _buildTextField(_classNameController, 'Class', Icons.class_)),
                const SizedBox(width: 16),
                Expanded(child: _buildTextField(_sectionController, 'Section', Icons.grid_view)),
              ],
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _submitForm,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.all(16),
                backgroundColor: Colors.indigo,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('REGISTER STUDENT', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, IconData icon, {TextInputType keyboardType = TextInputType.text}) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: Colors.indigo.shade300),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: Colors.white,
      ),
      keyboardType: keyboardType,
      validator: (val) => val == null || val.isEmpty ? 'This field is required' : null,
    );
  }

  Widget _buildBulkUploadView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Icon(Icons.people_outline, size: 80, color: Colors.indigo),
          const SizedBox(height: 16),
          const Text('Bulk Enrollment', textAlign: TextAlign.center, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          const Text('Upload a CSV file with student details (name, email, admission_id, etc.) to register multiple students at once.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 40),
          ElevatedButton.icon(
            onPressed: _handleBulkUpload,
            icon: const Icon(Icons.file_upload),
            label: const Text('CHOOSE CSV FILE'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.all(16),
              backgroundColor: Colors.indigo,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }
}
