import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../models/user.dart';
import '../models/finance.dart';
import '../services/finance_service.dart';

class FinanceScreen extends StatefulWidget {
  final User user;

  const FinanceScreen({Key? key, required this.user}) : super(key: key);

  @override
  _FinanceScreenState createState() => _FinanceScreenState();
}

class _FinanceScreenState extends State<FinanceScreen> with SingleTickerProviderStateMixin {
  final FinanceService _financeService = FinanceService();
  bool _isLoading = true;
  List<ClassFeeSummary> _summaries = [];
  List<FeeRecord> _studentFees = [];
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
    try {
      if (_isAdminOrTeacher) {
        final data = await _financeService.getFinanceSummary(widget.user.clientId);
        if (mounted) {
          setState(() {
            _summaries = data;
            _isLoading = false;
          });
        }
      } else {
        // Students: fetch their class details and filter
        final data = await _financeService.getClassFeeDetails(widget.user.className, widget.user.clientId);
        if (mounted) {
          setState(() {
            final myDetail = data.firstWhere((d) => d.userId == widget.user.id, orElse: () => StudentFeeDetail(userId: 0, firstName: '', lastName: '', fees: []));
            _studentFees = myDetail.fees;
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error loading finance data: $e')));
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
            toolbarHeight: 0,
            bottom: TabBar(
              controller: _tabController,
              labelColor: Colors.indigo,
              indicatorColor: Colors.indigo,
              tabs: const [
                Tab(icon: Icon(Icons.account_balance), text: 'Summary'),
                Tab(icon: Icon(Icons.upload_file), text: 'Bulk Upload'),
              ],
            ),
          )
        : null,
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

  Widget _buildAdminSummaryView() {
    if (_summaries.isEmpty) {
      return const Center(child: Text('No class fee summaries found.'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _summaries.length,
      itemBuilder: (context, index) {
        final summary = _summaries[index];
        final double collectedPct = summary.totalDue > 0 ? (summary.totalPaid / summary.totalDue) * 100 : 0;
        
        return Card(
          elevation: 0,
          margin: const EdgeInsets.only(bottom: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.grey.shade200),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(summary.className.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.indigo)),
                    Text('${summary.studentCount} Students', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                  ],
                ),
                const SizedBox(height: 16),
                _buildFeeRow('Total Due', summary.totalDue, Colors.red.shade700),
                const SizedBox(height: 8),
                _buildFeeRow('Total Collected', summary.totalPaid, Colors.green.shade700),
                const SizedBox(height: 16),
                LinearProgressIndicator(
                  value: collectedPct / 100,
                  backgroundColor: Colors.grey.shade100,
                  color: Colors.indigo,
                  minHeight: 8,
                ),
                const SizedBox(height: 8),
                Text('Collection Rate: ${collectedPct.toStringAsFixed(1)}%', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildFeeRow(String label, double amount, Color amountColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Colors.blueGrey)),
        Text('₹ ${amount.toStringAsFixed(2)}', style: TextStyle(fontWeight: FontWeight.bold, color: amountColor, fontSize: 16)),
      ],
    );
  }

  Widget _buildStudentView() {
    if (_studentFees.isEmpty) {
      return const Center(child: Text('No fee records found. Reach out to the accounts office.'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _studentFees.length,
      itemBuilder: (context, index) {
        final fee = _studentFees[index];
        final color = fee.status == 'Paid' ? Colors.green : (fee.status == 'Partial' ? Colors.orange : Colors.red);
        
        return Card(
          elevation: 2,
          margin: const EdgeInsets.only(bottom: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(fee.term, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                      child: Text(fee.status, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ],
                ),
                const Divider(height: 32),
                _buildStudentFeeDetail('Amount Due', fee.amountDue, Colors.black87),
                const SizedBox(height: 8),
                _buildStudentFeeDetail('Amount Paid', fee.amountPaid, Colors.green.shade700),
                const SizedBox(height: 8),
                _buildStudentFeeDetail('Balance', fee.amountDue - fee.amountPaid, Colors.red.shade700),
                const SizedBox(height: 16),
                if (fee.dueDate != null) 
                  Text('Due Date: ${fee.dueDate}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildStudentFeeDetail(String label, double amount, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey)),
        Text('₹ ${amount.toStringAsFixed(2)}', style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 16)),
      ],
    );
  }

  Widget _buildAdminUploadView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Icon(Icons.file_upload_outlined, size: 80, color: Colors.indigo),
          const SizedBox(height: 16),
          const Text('Fee Structure Upload', textAlign: TextAlign.center, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          const Text('Upload a CSV file containing: admission_id, term, amount_due, amount_paid, status, and due_date.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 40),
          ElevatedButton.icon(
            onPressed: _handleFileUpload,
            icon: const Icon(Icons.folder),
            label: const Text('SELECT CSV FILE'),
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

  Future<void> _handleFileUpload() async {
    FilePickerResult? result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['csv'],
    );

    if (result != null && result.files.single.path != null) {
      setState(() => _isLoading = true);
      final success = await _financeService.uploadFeesCsv(result.files.single.path!, widget.user.clientId);
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success ? 'Fees uploaded successfully!' : 'Error uploading fees.'),
            backgroundColor: success ? Colors.green : Colors.red,
          ),
        );
        if (success) _fetchData();
      }
    }
  }
}
