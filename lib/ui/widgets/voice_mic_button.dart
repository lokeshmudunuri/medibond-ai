import 'package:flutter/material.dart';
import '../../core/config/app_theme.dart';
import '../../screens/voice/voice_assistant_sheet.dart';

class VoiceMicButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final double size;

  const VoiceMicButton({
    super.key,
    this.onPressed,
    this.size = 56.0,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: FloatingActionButton(
        onPressed: onPressed ?? () => VoiceAssistantSheet.show(context),
        backgroundColor: AppTheme.primaryTeal,
        elevation: 4,
        shape: const CircleBorder(),
        child: const Icon(Icons.mic, color: Colors.white, size: 28),
      ),
    );
  }
}
