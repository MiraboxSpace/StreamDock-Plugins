// Licensed to the Chroma Control Contributors under one or more agreements.
// The Chroma Control Contributors licenses this file to you under the MIT license.
// See the LICENSE file in the project root for more information.

using ChromaControl.SDK.Synapse.Enums;
using ChromaControl.SDK.Synapse.Internal;
using ChromaControl.SDK.Synapse.Internal.Enums;
using System.Drawing;

namespace ChromaControl.SDK.Synapse;

/// <inheritdoc/>
public partial class SynapseService : ISynapseService
{
    /// <inheritdoc/>
    public bool Started { get; internal set; }

    /// <inheritdoc/>
    public SynapseStatus CurrentStatus { get; internal set; }

    /// <inheritdoc/>
    public event EventHandler<SynapseStatus>? StatusChanged;

    /// <inheritdoc/>
    public event EventHandler<Color[]>? ColorsReceived;

    private NativeSynapseService.RegisterEventNotificationCallback RegisterEventNotificationCallbackState { get; set; }

    /// <summary>
    /// Creates a <see cref="SynapseService"/> instance.
    /// </summary>
    public SynapseService()
    {
        RegisterEventNotificationCallbackState = new(OnEventNotification);
    }

    internal SynapseResult StartService(in Guid appId)
    {
        var initResult = NativeSynapseService.Init(appId);

        if (initResult != SynapseResult.Success)
        {
            return initResult;
        }

        var registerResult = NativeSynapseService.RegisterEventNotification(RegisterEventNotificationCallbackState);

        if (registerResult == SynapseResult.Success)
        {
            Started = true;
        }

        return registerResult;
    }

    internal SynapseResult StopService()
    {
        var unRegisterResult = NativeSynapseService.UnRegisterEventNotification();

        if (unRegisterResult != SynapseResult.Success)
        {
            return unRegisterResult;
        }

        var unInitResult = NativeSynapseService.UnInit();

        if (unInitResult == SynapseResult.Success)
        {
            Started = false;
            CurrentStatus = SynapseStatus.NotLive;
        }

        return unInitResult;
    }

    private unsafe SynapseResult OnEventNotification(SynapseEventType type, nint pData)
    {
        if (type == SynapseEventType.Effect)
        {
            var span = new ReadOnlySpan<byte>(pData.ToPointer(), 20);

            var colors = new Color[]
            {
                Color.FromArgb(span[3], span[0], span[1], span[2]),
                Color.FromArgb(span[7], span[4], span[5], span[6]),
                Color.FromArgb(span[11], span[8], span[9], span[10]),
                Color.FromArgb(span[15], span[12], span[13], span[14]),
                Color.FromArgb(span[19], span[16], span[17], span[18]),
            };

            ColorsReceived?.Invoke(this, colors);
        }
        else if (type == SynapseEventType.Status)
        {
            CurrentStatus = (SynapseStatus)pData.ToInt32();

            StatusChanged?.Invoke(this, CurrentStatus);
        }

        return SynapseResult.Success;
    }
}
