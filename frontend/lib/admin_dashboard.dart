import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:intl/intl.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'export_helper.dart';

class AdminDashboard extends StatelessWidget {
  const AdminDashboard({super.key});

  Future<void> _exportData(BuildContext context) async {
    try {
      // Fetch administrative user summaries strictly containing non-sensitive details
      final summariesSnapshot = await FirebaseFirestore.instance
          .collection('AdminUserSummaries')
          .get();

      if (summariesSnapshot.docs.isEmpty) {
        // Fallback: Query Users collection to construct summary export if summaries collection is empty
        final usersSnapshot = await FirebaseFirestore.instance.collection('Users').get();
        final csvBuffer = StringBuffer();
        csvBuffer.writeln('Name,Email,User ID,Submissions');
        for (var doc in usersSnapshot.docs) {
          final data = doc.data();
          final email = (data['email'] as String? ?? 'Unknown').replaceAll('"', '""');
          final name = (data['displayName'] as String? ?? data['name'] ?? email.split('@')[0]).replaceAll('"', '""');
          final uid = doc.id;
          csvBuffer.writeln('"$name","$email","$uid",0');
        }
        downloadCsv(csvBuffer.toString(), 'pitchlab_admin_users_${DateTime.now().millisecondsSinceEpoch}.csv');
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('CSV Export completed successfully!')),
          );
        }
        return;
      }

      // Build CSV with strictly 4 administrative fields: Name, Email, User ID, Submissions
      final csvBuffer = StringBuffer();
      csvBuffer.writeln('Name,Email,User ID,Submissions');

      for (var doc in summariesSnapshot.docs) {
        final data = doc.data();
        final name = (data['displayName'] as String? ?? 'Founder').replaceAll('"', '""');
        final email = (data['email'] as String? ?? 'Unknown').replaceAll('"', '""');
        final uid = data['uid'] ?? doc.id;
        final count = data['submissionCount'] ?? 0;

        csvBuffer.writeln('"$name","$email","$uid",$count');
      }

      downloadCsv(csvBuffer.toString(), 'pitchlab_admin_users_${DateTime.now().millisecondsSinceEpoch}.csv');
      
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Administrative User CSV Export completed!')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Export failed: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: const Color(0xFFFBFBFD),
        appBar: AppBar(
          title: Text(
            'Master Admin User Management',
            style: GoogleFonts.outfit(
              fontWeight: FontWeight.w600,
              color: const Color(0xFF1D1D1F),
            ),
          ),
          backgroundColor: Colors.white,
          elevation: 0.5,
          iconTheme: const IconThemeData(color: Color(0xFF1D1D1F)),
          actions: [
            TextButton.icon(
              onPressed: () => _exportData(context),
              icon: const Icon(Icons.download, size: 18),
              label: const Text('Export CSV'),
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFF0071E3),
              ),
            ),
            const SizedBox(width: 16),
          ],
          bottom: const TabBar(
            tabs: [
              Tab(icon: Icon(Icons.people_alt_outlined), text: 'Users'),
              Tab(icon: Icon(Icons.mail_outline), text: 'Invitations'),
            ],
            labelColor: Color(0xFF0071E3),
            unselectedLabelColor: Colors.grey,
            indicatorColor: Color(0xFF0071E3),
          ),
        ),
        body: const TabBarView(
          children: [
            _UsersList(),
            _InvitationsList(),
          ],
        ),
      ),
    );
  }
}

class _UsersList extends StatefulWidget {
  const _UsersList();

  @override
  State<_UsersList> createState() => _UsersListState();
}

class _UsersListState extends State<_UsersList> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _deleteUser(BuildContext context, String targetUid) async {
    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(),
        ),
      );

      await FirebaseFunctions.instanceFor(region: 'us-central1')
          .httpsCallable('deleteUserAdmin')
          .call({'userId': targetUid});

      if (context.mounted) {
        Navigator.pop(context); // Dismiss loading spinner
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('User and all records deleted.')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context); // Dismiss loading spinner
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Delete failed: $e')),
        );
      }
    }
  }

  void _confirmDeleteUser(BuildContext context, String targetUid, String email) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete User?', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        content: Text('Are you sure you want to permanently delete $email? This will wipe their Auth account, profile, and administrative record. This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _deleteUser(context, targetUid);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete Permanently'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currentUserUid = FirebaseAuth.instance.currentUser?.uid;

    return Column(
      children: [
        // Search Bar (Filtered by Name, Email, or User ID only)
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: TextField(
            controller: _searchController,
            onChanged: (val) => setState(() => _searchQuery = val.trim().toLowerCase()),
            decoration: InputDecoration(
              hintText: 'Search users by Name, Email, or User ID...',
              prefixIcon: const Icon(Icons.search, color: Colors.grey),
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
            ),
          ),
        ),

        // User Management Table Header Banner
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          color: Colors.grey.shade100,
          child: Row(
            children: [
              Expanded(flex: 3, child: Text('NAME', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey.shade700))),
              Expanded(flex: 4, child: Text('EMAIL', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey.shade700))),
              Expanded(flex: 4, child: Text('USER ID', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey.shade700))),
              Expanded(flex: 2, child: Text('SUBMISSIONS', textAlign: TextAlign.center, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey.shade700))),
              const SizedBox(width: 48), // Action column space
            ],
          ),
        ),

        // User Stream from AdminUserSummaries Collection
        Expanded(
          child: StreamBuilder<QuerySnapshot>(
            stream: FirebaseFirestore.instance.collection('AdminUserSummaries').snapshots(),
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                // Fallback to Users collection if AdminUserSummaries has not been populated yet
                return _buildUsersFallbackStream(currentUserUid);
              }
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              final docs = snapshot.data?.docs ?? [];
              if (docs.isEmpty) {
                return _buildUsersFallbackStream(currentUserUid);
              }

              final filtered = docs.where((doc) {
                final data = doc.data() as Map<String, dynamic>;
                final name = (data['displayName'] ?? '').toString().toLowerCase();
                final email = (data['email'] ?? '').toString().toLowerCase();
                final uid = doc.id.toLowerCase();
                if (_searchQuery.isEmpty) return true;
                return name.contains(_searchQuery) || email.contains(_searchQuery) || uid.contains(_searchQuery);
              }).toList();

              if (filtered.isEmpty) {
                return Center(
                  child: Text('No users match search criteria', style: GoogleFonts.inter(color: Colors.grey)),
                );
              }

              return ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: filtered.length,
                separatorBuilder: (context, index) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final doc = filtered[index];
                  final data = doc.data() as Map<String, dynamic>;
                  final name = data['displayName'] ?? (data['email'] != null ? (data['email'] as String).split('@')[0] : 'Founder');
                  final email = data['email'] ?? 'Unknown Email';
                  final uid = doc.id;
                  final count = data['submissionCount'] ?? 0;
                  final isMe = uid == currentUserUid;

                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                    color: Colors.white,
                    child: Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: Text(
                            name,
                            style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Expanded(
                          flex: 4,
                          child: Text(
                            email,
                            style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade800),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Expanded(
                          flex: 4,
                          child: SelectableText(
                            uid,
                            style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade600),
                          ),
                        ),
                        Expanded(
                          flex: 2,
                          child: Text(
                            '$count',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14, color: const Color(0xFF1D1D1F)),
                          ),
                        ),
                        SizedBox(
                          width: 48,
                          child: isMe
                              ? const SizedBox.shrink()
                              : IconButton(
                                  icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                                  tooltip: 'Delete User',
                                  onPressed: () => _confirmDeleteUser(context, uid, email),
                                ),
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildUsersFallbackStream(String? currentUserUid) {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance.collection('Users').snapshots(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        final users = snapshot.data?.docs ?? [];
        if (users.isEmpty) {
          return Center(child: Text('No users found', style: GoogleFonts.inter(color: Colors.grey)));
        }

        final filtered = users.where((doc) {
          final data = doc.data() as Map<String, dynamic>;
          final email = (data['email'] ?? '').toString().toLowerCase();
          final uid = doc.id.toLowerCase();
          final name = (data['displayName'] ?? email.split('@')[0]).toString().toLowerCase();
          if (_searchQuery.isEmpty) return true;
          return name.contains(_searchQuery) || email.contains(_searchQuery) || uid.contains(_searchQuery);
        }).toList();

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: filtered.length,
          separatorBuilder: (context, index) => const Divider(height: 1),
          itemBuilder: (context, index) {
            final userDoc = filtered[index];
            final data = userDoc.data() as Map<String, dynamic>;
            final email = data['email'] ?? 'Unknown Email';
            final uid = userDoc.id;
            final name = data['displayName'] ?? email.split('@')[0];
            final isMe = uid == currentUserUid;

            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
              color: Colors.white,
              child: Row(
                children: [
                  Expanded(
                    flex: 3,
                    child: Text(
                      name,
                      style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Expanded(
                    flex: 4,
                    child: Text(
                      email,
                      style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade800),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Expanded(
                    flex: 4,
                    child: SelectableText(
                      uid,
                      style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade600),
                    ),
                  ),
                  Expanded(
                    flex: 2,
                    child: StreamBuilder<QuerySnapshot>(
                      stream: FirebaseFirestore.instance.collection('EvaluationScore').where('userId', isEqualTo: uid).snapshots(),
                      builder: (context, evalSnap) {
                        final count = evalSnap.data?.docs.length ?? 0;
                        return Text(
                          '$count',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14, color: const Color(0xFF1D1D1F)),
                        );
                      },
                    ),
                  ),
                  SizedBox(
                    width: 48,
                    child: isMe
                        ? const SizedBox.shrink()
                        : IconButton(
                            icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                            tooltip: 'Delete User',
                            onPressed: () => _confirmDeleteUser(context, uid, email),
                          ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _InvitationsList extends StatefulWidget {
  const _InvitationsList();

  @override
  State<_InvitationsList> createState() => _InvitationsListState();
}

class _InvitationsListState extends State<_InvitationsList> {
  final _emailController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _sendInvitation({bool skipEmail = false}) async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter an email address.')),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final appUrl = Uri.base.origin;
      print('🚀 PitchLab Admin: Sending invite for $email with base URL $appUrl (skipEmail: $skipEmail)');

      final result = await FirebaseFunctions.instanceFor(region: 'us-central1')
          .httpsCallable('sendInvitation')
          .call({
            'email': email,
            'skipEmail': skipEmail,
          });

      final data = result.data as Map<dynamic, dynamic>?;
      final token = data?['token'] as String?;

      if (mounted) {
        _emailController.clear();
        
        if (skipEmail && token != null) {
          final directLink = '${Uri.base.origin}/?inviteToken=$token';
          Clipboard.setData(ClipboardData(text: directLink));
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Link generated and copied to clipboard!')),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Invitation sent successfully!')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to generate invitation: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _deleteInvitation(String token) async {
    try {
      await FirebaseFirestore.instance.collection('Invitations').doc(token).delete();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Invitation deleted.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete invitation: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Card(
          margin: const EdgeInsets.all(16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: Colors.grey.shade200),
          ),
          elevation: 0,
          color: Colors.white,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Invite a Founder',
                  style: GoogleFonts.outfit(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF1D1D1F),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Send an invitation email containing a secure link to input a business idea.',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: InputDecoration(
                          hintText: 'Enter founder email address',
                          prefixIcon: const Icon(Icons.mail_outline),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: BorderSide(color: Colors.grey.shade300),
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: _isLoading ? null : () => _sendInvitation(skipEmail: false),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0071E3),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        elevation: 0,
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text('Send Email Invite'),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      onPressed: _isLoading ? null : () => _sendInvitation(skipEmail: true),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF0071E3),
                        side: const BorderSide(color: Color(0xFF0071E3)),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text('Generate Link Only'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0),
          child: Row(
            children: [
              Text(
                'Sent Invitations',
                style: GoogleFonts.outfit(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF1D1D1F),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: StreamBuilder<QuerySnapshot>(
            stream: FirebaseFirestore.instance.collection('Invitations').orderBy('createdAt', descending: true).snapshots(),
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return Center(child: Text('Error: ${snapshot.error}'));
              }
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              final invites = snapshot.data?.docs ?? [];

              if (invites.isEmpty) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32.0),
                    child: Text(
                      'No invitations sent yet',
                      style: GoogleFonts.inter(color: Colors.grey),
                    ),
                  ),
                );
              }

              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: invites.length,
                itemBuilder: (context, index) {
                  final doc = invites[index];
                  final data = doc.data() as Map<String, dynamic>;
                  final email = data['email'] ?? 'Unknown Email';
                  final token = data['token'] ?? '';
                  final status = data['status'] ?? 'pending';
                  final Timestamp? createdTs = data['createdAt'];
                  final createdAt = createdTs != null
                      ? DateFormat.yMMMd().add_jm().format(createdTs.toDate())
                      : 'Unknown Date';
                  final emailPreviewUrl = data['emailPreviewUrl'] as String?;

                  final directLink = '${Uri.base.origin}/?inviteToken=$token';

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: Colors.grey.shade200),
                    ),
                    elevation: 0,
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(16),
                      leading: CircleAvatar(
                        backgroundColor: status == 'completed' ? Colors.green.shade100 : Colors.amber.shade100,
                        foregroundColor: status == 'completed' ? Colors.green.shade700 : Colors.amber.shade700,
                        child: Icon(status == 'completed' ? Icons.check_circle : Icons.hourglass_empty),
                      ),
                      title: Text(
                        email,
                        style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Text('Status: ', style: GoogleFonts.inter(fontSize: 12)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: status == 'completed' ? Colors.green.shade50 : Colors.amber.shade50,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  status.toUpperCase(),
                                  style: GoogleFonts.inter(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: status == 'completed' ? Colors.green.shade800 : Colors.amber.shade900
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text('Sent: $createdAt', style: GoogleFonts.inter(fontStyle: FontStyle.italic, fontSize: 12)),
                          const SizedBox(height: 4),
                          SelectableText(
                            directLink,
                            style: GoogleFonts.inter(fontSize: 10, color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.copy, size: 18, color: Colors.grey),
                            tooltip: 'Copy Invite Link',
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: directLink));
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Link copied to clipboard!')),
                              );
                            },
                          ),
                          if (emailPreviewUrl != null && emailPreviewUrl.isNotEmpty)
                            IconButton(
                              icon: const Icon(Icons.open_in_new, size: 18, color: Colors.blue),
                              tooltip: 'View Email Preview (Ethereal)',
                              onPressed: () async {
                                final uri = Uri.parse(emailPreviewUrl);
                                if (await canLaunchUrl(uri)) {
                                  await launchUrl(uri);
                                }
                              },
                            ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
                            tooltip: 'Delete Invite',
                            onPressed: () => _deleteInvitation(token),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}
