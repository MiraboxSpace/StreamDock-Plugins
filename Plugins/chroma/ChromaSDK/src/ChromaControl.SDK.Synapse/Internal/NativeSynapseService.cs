// Licensed to the Chroma Control Contributors under one or more agreements.
// The Chroma Control Contributors licenses this file to you under the MIT license.
// See the LICENSE file in the project root for more information.

using ChromaControl.SDK.Synapse.Enums;
using ChromaControl.SDK.Synapse.Internal.Enums;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

namespace ChromaControl.SDK.Synapse.Internal;

internal sealed partial class NativeSynapseService
{
    private static bool Is32Bit => nint.Size == 4;

    internal delegate SynapseResult RegisterEventNotificationCallback(SynapseEventType type, nint pData);

    public static SynapseResult Init(in Guid appId)
    {
        try
        {
            return Is32Bit ? Init32(appId) : Init64(appId);
        }
        catch (SEHException)
        {
            return SynapseResult.Failed;
        }
    }

    public static SynapseResult UnInit()
    {
        try
        {
            return Is32Bit ? UnInit32() : UnInit64();
        }
        catch (SEHException)
        {
            return SynapseResult.Failed;
        }
    }

    public static SynapseResult RegisterEventNotification(RegisterEventNotificationCallback lpFunc)
    {
        try
        {
            return Is32Bit ? RegisterEventNotification32(lpFunc) : RegisterEventNotification64(lpFunc);
        }
        catch (SEHException)
        {
            return SynapseResult.Failed;
        }
    }

    public static SynapseResult UnRegisterEventNotification()
    {
        try
        {
            return Is32Bit ? UnRegisterEventNotification32() : UnRegisterEventNotification64();
        }
        catch (SEHException)
        {
            return SynapseResult.Failed;
        }
    }

    [LibraryImport("RzChromaConnectAPI", EntryPoint = "Init", SetLastError = false)]
    [UnmanagedCallConv(CallConvs = [typeof(CallConvCdecl)])]
    private static partial SynapseResult Init32(in Guid appId);

    [LibraryImport("RzChromaConnectAPI64", EntryPoint = "Init", SetLastError = false)]
    [UnmanagedCallConv(CallConvs = [typeof(CallConvCdecl)])]
    private static partial SynapseResult Init64(in Guid appId);

    [LibraryImport("RzChromaConnectAPI", EntryPoint = "UnInit", SetLastError = false)]
    [UnmanagedCallConv(CallConvs = [typeof(CallConvCdecl)])]
    private static partial SynapseResult UnInit32();

    [LibraryImport("RzChromaConnectAPI64", EntryPoint = "UnInit", SetLastError = false)]
    [UnmanagedCallConv(CallConvs = [typeof(CallConvCdecl)])]
    private static partial SynapseResult UnInit64();

    [LibraryImport("RzChromaConnectAPI", EntryPoint = "RegisterEventNotification", SetLastError = false)]
    [UnmanagedCallConv(CallConvs = [typeof(CallConvCdecl)])]
    private static partial SynapseResult RegisterEventNotification32(RegisterEventNotificationCallback lpFunc);

    [LibraryImport("RzChromaConnectAPI64", EntryPoint = "RegisterEventNotification", SetLastError = false)]
    [UnmanagedCallConv(CallConvs = [typeof(CallConvCdecl)])]
    private static partial SynapseResult RegisterEventNotification64(RegisterEventNotificationCallback lpFunc);

    [LibraryImport("RzChromaConnectAPI", EntryPoint = "UnRegisterEventNotification", SetLastError = false)]
    [UnmanagedCallConv(CallConvs = [typeof(CallConvCdecl)])]
    private static partial SynapseResult UnRegisterEventNotification32();

    [LibraryImport("RzChromaConnectAPI64", EntryPoint = "UnRegisterEventNotification", SetLastError = false)]
    [UnmanagedCallConv(CallConvs = [typeof(CallConvCdecl)])]
    private static partial SynapseResult UnRegisterEventNotification64();
}
