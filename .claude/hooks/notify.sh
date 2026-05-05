#!/bin/bash
# Windows Toast Notification for Claude Code
# WSL から PowerShell を呼び出してトースト通知を表示する

TITLE="Claude Code"
BODY="Claude Codeから通知があります"
SOUND="ms-winsoundevent:Notification.Reminder"

powershell.exe -Command "$(cat <<EOF
# 通知テンプレート（タイトル+本文の2行形式）を取得
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
\$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
\$xml = [xml]\$template.GetXml()

# タイトルと本文をセット
\$xml.toast.visual.binding.text[0].AppendChild(\$xml.CreateTextNode('$TITLE')) | Out-Null
\$xml.toast.visual.binding.text[1].AppendChild(\$xml.CreateTextNode('$BODY')) | Out-Null

# 通知音をセット
\$audio = \$xml.CreateElement('audio')
\$audio.SetAttribute('src', '$SOUND')
\$audio.SetAttribute('loop', 'false')
\$xml.toast.AppendChild(\$audio) | Out-Null

# XML をシリアライズして通知を表示
\$serialized = New-Object -TypeName Windows.Data.Xml.Dom.XmlDocument
\$serialized.LoadXml(\$xml.OuterXml)
\$toast = [Windows.UI.Notifications.ToastNotification]::new(\$serialized)
\$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('$TITLE')
\$notifier.Show(\$toast)
EOF
)"
