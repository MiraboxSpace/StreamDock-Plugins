// Licensed to the Chroma Control Contributors under one or more agreements.
// The Chroma Control Contributors licenses this file to you under the MIT license.
// See the LICENSE file in the project root for more information.

namespace ChromaControl.SDK.Synapse.Enums;

/// <summary>
/// Synapse status.
/// </summary>
public enum SynapseStatus
{
    /// <summary>
    /// <see cref="Live"/> occurs when all expected conditions are met.
    /// </summary>
    Live = 1,

    /// <summary>
    /// <see cref="NotLive"/> occurs when one of the expected conditions is not fulfilled.
    /// </summary>
    NotLive = 2
}
