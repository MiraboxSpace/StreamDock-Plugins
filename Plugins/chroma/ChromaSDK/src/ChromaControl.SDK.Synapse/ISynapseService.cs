// Licensed to the Chroma Control Contributors under one or more agreements.
// The Chroma Control Contributors licenses this file to you under the MIT license.
// See the LICENSE file in the project root for more information.

using ChromaControl.SDK.Synapse.Enums;
using System.Drawing;

namespace ChromaControl.SDK.Synapse;

/// <summary>
/// The Razer Synapse Service.
/// </summary>
public interface ISynapseService
{
    /// <summary>
    /// If the Synapse service has started.
    /// </summary>
    bool Started { get; }

    /// <summary>
    /// The current status.
    /// </summary>
    SynapseStatus CurrentStatus { get; }

    /// <summary>
    /// Occurs when the service status changes.
    /// </summary>
    event EventHandler<SynapseStatus>? StatusChanged;

    /// <summary>
    /// Occurs when color data is received.
    /// </summary>
    event EventHandler<Color[]>? ColorsReceived;
}
