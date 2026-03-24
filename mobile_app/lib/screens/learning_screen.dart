import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/user.dart';
import '../models/learning.dart';
import '../services/learning_service.dart';

class LearningScreen extends StatefulWidget {
  final User user;

  const LearningScreen({Key? key, required this.user}) : super(key: key);

  @override
  _LearningScreenState createState() => _LearningScreenState();
}

class _LearningScreenState extends State<LearningScreen> {
  final LearningService _learningService = LearningService();
  bool _isLoading = true;
  List<ClassCourseGroup> _groupedCourses = [];
  String? _expandedClassName;

  // Admin Upload State
  bool _isUploading = false;
  String? _uploadMessage;
  String? _uploadMessageType;

  bool get _isAdmin => 
    widget.user.role == 'college_admin' || widget.user.role == 'system_admin';

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final data = await _learningService.getLearningClasses(widget.user.clientId);
      if (mounted) {
        setState(() {
          _groupedCourses = data;
          if (_groupedCourses.isNotEmpty && _expandedClassName == null) {
            _expandedClassName = _groupedCourses[0].className;
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading courses: $e')),
        );
      }
    }
  }

  Future<void> _handleBulkUpload() async {
    FilePickerResult? result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['csv'],
    );

    if (result != null && result.files.single.path != null) {
      setState(() {
        _isUploading = true;
        _uploadMessage = null;
      });

      final success = await _learningService.bulkUploadCourses(
        result.files.single.path!, 
        widget.user.clientId,
      );

      if (mounted) {
        setState(() {
          _isUploading = false;
          _uploadMessage = success 
            ? 'Courses uploaded successfully!' 
            : 'Error uploading courses.';
          _uploadMessageType = success ? 'success' : 'error';
        });
        if (success) _fetchData();
      }
    }
  }

  Future<void> _launchURL(String url) async {
    final Uri uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not launch $url')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : Column(
            children: [
              if (_isAdmin) _buildAdminHeader(),
              Expanded(
                child: _groupedCourses.isEmpty
                  ? const Center(child: Text('No courses assigned yet.'))
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _groupedCourses.length,
                      itemBuilder: (context, index) {
                        return _buildClassGroup(_groupedCourses[index]);
                      },
                    ),
              ),
            ],
          ),
    );
  }

  Widget _buildAdminHeader() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(Icons.cloud_upload_outlined, color: Colors.indigo),
              const SizedBox(width: 8),
              const Flexible(
                child: Text(
                  'Bulk Course Management', 
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const Spacer(),
              ElevatedButton.icon(
                onPressed: _isUploading ? null : _handleBulkUpload,
                icon: const Icon(Icons.upload, size: 18),
                label: Text(_isUploading ? 'Uploading...' : 'Upload CSV'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.indigo.shade50,
                  foregroundColor: Colors.indigo,
                  elevation: 0,
                ),
              ),
            ],
          ),
          if (_uploadMessage != null) ...[
            const SizedBox(height: 8),
            Text(_uploadMessage!, 
              style: TextStyle(
                color: _uploadMessageType == 'success' ? Colors.green : Colors.red,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildClassGroup(ClassCourseGroup group) {
    final bool isExpanded = _expandedClassName == group.className;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          InkWell(
            onTap: () {
              setState(() {
                _expandedClassName = isExpanded ? null : group.className;
              });
            },
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: isExpanded ? Colors.indigo : Colors.transparent,
                borderRadius: isExpanded 
                  ? const BorderRadius.vertical(top: Radius.circular(16))
                  : BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Icon(Icons.book_outlined, color: isExpanded ? Colors.white : Colors.indigo),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          group.className,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: isExpanded ? Colors.white : Colors.indigo.shade900,
                          ),
                        ),
                        Text(
                          '${group.courses.length} Course(s)',
                          style: TextStyle(
                            fontSize: 12,
                            color: isExpanded ? Colors.indigo.shade50 : Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    isExpanded ? Icons.expand_less : Icons.expand_more,
                    color: isExpanded ? Colors.white.withOpacity(0.7) : Colors.grey,
                  ),
                ],
              ),
            ),
          ),
          if (isExpanded)
            Container(
              color: Colors.grey.shade50,
              padding: const EdgeInsets.all(16),
              child: group.courses.isEmpty
                ? const Text('No courses available.')
                : Column(
                    children: group.courses.map((course) => _buildCourseCard(course)).toList(),
                  ),
            ),
        ],
      ),
    );
  }

  Widget _buildCourseCard(LearningCourse course) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.indigo.withOpacity(0.05),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(course.title, 
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.indigo.shade900)),
                const SizedBox(height: 4),
                Text(course.description, 
                  style: TextStyle(fontSize: 13, color: Colors.indigo.shade700)),
              ],
            ),
          ),
          if (course.materials.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: Text('No materials yet.', style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic, fontSize: 13)),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: course.materials.length,
              separatorBuilder: (ctx, idx) => Divider(height: 1, color: Colors.grey.shade100),
              itemBuilder: (ctx, idx) {
                final material = course.materials[idx];
                return ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  leading: _getMaterialIcon(material.materialType),
                  title: Text(material.title, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
                  subtitle: Text(material.materialType, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  trailing: IconButton(
                    icon: const Icon(Icons.download_for_offline_outlined, color: Colors.grey),
                    onPressed: () => _launchURL(material.contentUrl),
                  ),
                  onTap: () => _launchURL(material.contentUrl),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _getMaterialIcon(String type) {
    IconData icon;
    Color color;

    switch (type.toUpperCase()) {
      case 'PDF':
        icon = Icons.picture_as_pdf;
        color = Colors.red;
        break;
      case 'VIDEO':
        icon = Icons.play_circle_outline;
        color = Colors.blue;
        break;
      case 'LINK':
        icon = Icons.link;
        color = Colors.green;
        break;
      default:
        icon = Icons.insert_drive_file_outlined;
        color = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: color, size: 20),
    );
  }
}
