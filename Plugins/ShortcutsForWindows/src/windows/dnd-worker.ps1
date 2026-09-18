# Long-lived worker that controls Windows 11 "Do Not Disturb".
#
# Uses the internal QuietHoursSettings COM class, which persists the active
# profile to CloudStore and notifies the system.
#
# The build embeds this script in bin/plugin.js, which starts it with
# powershell.exe -EncodedCommand; it is never read from disk at runtime.
#
# Protocol (one command per line on stdin, one response per line on stdout):
#   get | on | off | toggle   ->   "on" | "off" | "error:<message>"

$ErrorActionPreference = 'Stop'
# Progress records would otherwise be written to stderr as CLIXML.
$ProgressPreference = 'SilentlyContinue'

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[ComImport, Guid("6bff4732-81ec-4ffb-ae67-b6c1bc29631f"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IQuietHoursSettings {
    [PreserveSig] int get_UserSelectedProfile([MarshalAs(UnmanagedType.LPWStr)] out string profileId);
    [PreserveSig] int put_UserSelectedProfile([MarshalAs(UnmanagedType.LPWStr)] string profileId);
}

public static class QuietHours {
    public const string Off = "Microsoft.QuietHoursProfile.Unrestricted";
    public const string On = "Microsoft.QuietHoursProfile.PriorityOnly";

    static IQuietHoursSettings Create() {
        var type = Type.GetTypeFromCLSID(new Guid("f53321fa-34f8-4b7f-b9a3-361877cb94cf"));
        return (IQuietHoursSettings)Activator.CreateInstance(type);
    }

    public static bool IsEnabled() {
        string profile;
        Marshal.ThrowExceptionForHR(Create().get_UserSelectedProfile(out profile));
        return !string.Equals(profile, Off, StringComparison.OrdinalIgnoreCase);
    }

    public static void SetEnabled(bool enabled) {
        Marshal.ThrowExceptionForHR(Create().put_UserSelectedProfile(enabled ? On : Off));
    }
}
"@

function Format-State { if ([QuietHours]::IsEnabled()) { 'on' } else { 'off' } }

[Console]::Out.WriteLine('ready')
[Console]::Out.Flush()

while ($null -ne ($line = [Console]::In.ReadLine())) {
    $command = $line.Trim()
    if ($command -eq '') { continue }
    try {
        switch ($command) {
            'get'    { }
            'on'     { [QuietHours]::SetEnabled($true) }
            'off'    { [QuietHours]::SetEnabled($false) }
            'toggle' { [QuietHours]::SetEnabled(-not [QuietHours]::IsEnabled()) }
            default  { throw "unknown command: $command" }
        }
        $response = Format-State
    } catch {
        $response = 'error:' + ($_.Exception.Message -replace '[\r\n]+', ' ')
    }
    [Console]::Out.WriteLine($response)
    [Console]::Out.Flush()
}
