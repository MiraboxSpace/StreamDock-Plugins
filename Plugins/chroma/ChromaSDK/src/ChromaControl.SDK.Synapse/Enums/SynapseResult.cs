// Licensed to the Chroma Control Contributors under one or more agreements.
// The Chroma Control Contributors licenses this file to you under the MIT license.
// See the LICENSE file in the project root for more information.

namespace ChromaControl.SDK.Synapse.Enums;

/// <summary>
/// Synapse return result.
/// </summary>
public enum SynapseResult : long
{
    /// <summary>
    /// Invalid.
    /// </summary>
    Invalid = -1L,

    /// <summary>
    /// Success.
    /// </summary>
    Success = 0L,

    /// <summary>
    /// Access denied.
    /// </summary>
    AccessDenied = 5L,

    /// <summary>
    /// Invalid handle.
    /// </summary>
    InvalidHandle = 6L,

    /// <summary>
    /// Invalid access.
    /// </summary>
    InvalidAccess = 12L,

    /// <summary>
    /// Not supported.
    /// </summary>
    NotSupported = 50L,

    /// <summary>
    /// Invalid parameter.
    /// </summary>
    InvalidParameter = 87L,

    /// <summary>
    /// The service does not exist.
    /// </summary>
    ServiceNotExist = 1060L,

    /// <summary>
    /// The service has not been started.
    /// </summary>
    ServiceNotActive = 1062L,

    /// <summary>
    /// Cannot start more than one instance of the specified program.
    /// </summary>
    SingleInstanceApp = 1152L,

    /// <summary>
    /// Device not connected.
    /// </summary>
    DeviceNotConnected = 1167L,

    /// <summary>
    /// Element not found.
    /// </summary>
    NotFound = 1168L,

    /// <summary>
    /// Request aborted.
    /// </summary>
    RequestAborted = 1235L,

    /// <summary>
    /// Requested operation is not performed because the user has not been authenticated.
    /// </summary>
    NotAuthenticated = 1244L,

    /// <summary>
    /// An attempt was made to perform an initialization operation when initialization has already been completed.
    /// </summary>
    AlreadyInitialized = 1247L,

    /// <summary>
    /// Resource not available or disabled.
    /// </summary>
    ResourceDisabled = 4309L,

    /// <summary>
    /// Device not available or supported.
    /// </summary>
    DeviceNotAvailable = 4319L,

    /// <summary>
    /// The group or resource is not in the correct state to perform the requested operation.
    /// </summary>
    NotValidState = 5023L,

    /// <summary>
    /// Insufficient access rights, administrator privilege required.
    /// </summary>
    InsufficientAccessRights = 8344L,

    /// <summary>
    /// No more items.
    /// </summary>
    NoMoreItems = 259L,

    /// <summary>
    /// General failure.
    /// </summary>
    Failed = 2147483647L
}
