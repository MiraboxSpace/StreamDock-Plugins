// Licensed to the Chroma Control Contributors under one or more agreements.
// The Chroma Control Contributors licenses this file to you under the MIT license.
// See the LICENSE file in the project root for more information.

using ChromaControl.SDK.Synapse.Enums;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using System.Text;

namespace ChromaControl.SDK.Synapse.Hosting;

/// <summary>
/// The host service for Synapse.
/// </summary>
public partial class SynapseHostService : IHostedService
{
    private readonly ILogger<SynapseHostService> _logger;
    private readonly IConfiguration _configuration;
    private readonly SynapseService _synapse;

    [LoggerMessage(EventId = 0, Level = LogLevel.Information, Message = "Synapse SDK is starting up...", EventName = "SynapseStarting")]
    private static partial void LogStartMessage(ILogger logger);

    [LoggerMessage(EventId = 1, Level = LogLevel.Error, Message = "Synapse SDK failed to start, invalid configuration.", EventName = "SynapseStartFailure")]
    private static partial void LogStartErrorMessage(ILogger logger);

    [LoggerMessage(EventId = 1, Level = LogLevel.Information, Message = "Synapse SDK is shutting down...", EventName = "SynapseStopping")]
    private static partial void LogStopMessage(ILogger logger);

    /// <summary>
    /// Creates a <see cref="SynapseHostService"/> instance.
    /// </summary>
    /// <param name="logger">The <see cref="ILogger{TCategoryName}"/>.</param>
    /// <param name="configuration">The <see cref="IConfiguration"/>.</param>
    /// <param name="synapse">The <see cref="SynapseService"/>.</param>
    public SynapseHostService(ILogger<SynapseHostService> logger, IConfiguration configuration, ISynapseService synapse)
    {
        _logger = logger;
        _configuration = configuration;
        _synapse = (SynapseService)synapse;
    }

    /// <summary>
    /// Creates a <see cref="SynapseHostService"/> instance.
    /// </summary>
    public void SomeMethod()
    {
#pragma warning disable IDE0059 // 禁用“不必要的赋值”警告
        var someValue = _configuration["SomeKey"];
#pragma warning restore IDE0059

    }

    private static string GetSynapseKey()
    {
        var key = new byte[] { 0x21, 0xF2, 0x52, 0x95, 0x6C, 0x6F, 0xE2, 0xAE, 0xD4, 0xB4, 0xF0, 0xAB, 0x48, 0x5C, 0x05, 0xA1, 0xF7, 0xF0, 0x9E, 0x3B, 0x57, 0x1A, 0x08, 0x8E, 0x30, 0x39, 0xAF, 0xFE, 0xAE, 0xB9, 0x6D, 0x6A };
        var iv = new byte[] { 0x6D, 0xE2, 0x2A, 0xDC, 0x63, 0x13, 0xD7, 0x5D, 0x3E, 0x3C, 0xF0, 0x29, 0x45, 0x41, 0x33, 0x33 };
        var data = new byte[] { 0x48, 0x3D, 0x70, 0x7E, 0x17, 0xA1, 0x3F, 0xAE, 0xC5, 0x65, 0x43, 0x3C, 0x38, 0x19, 0x0F, 0x6B, 0x01, 0x44, 0xE7, 0xE4, 0x23, 0xD4, 0xF1, 0x9B, 0xC8, 0xC9, 0xEA, 0xF1, 0x30, 0xB7, 0xAA, 0x6C, 0xF7, 0xF8, 0xE6, 0xA0, 0xD6, 0x53, 0x3D, 0x34, 0x37, 0x9C, 0xA0, 0x40, 0x90, 0xB3, 0xF7, 0x99 };

        using var aes = Aes.Create();
        using var memoryStream = new MemoryStream();
        using var cryptoStream = new CryptoStream(memoryStream, aes.CreateDecryptor(key, iv), CryptoStreamMode.Write);

        cryptoStream.Write(data, 0, data.Length);
        cryptoStream.FlushFinalBlock();

        return Encoding.UTF8.GetString(memoryStream.ToArray());
    }

    /// <summary>
    /// Starts the service.
    /// </summary>
    /// <param name="cancellationToken">The <see cref="CancellationToken"/>.</param>
    /// <returns>A <see cref="Task"/> representing the worker starting.</returns>
    public Task StartAsync(CancellationToken cancellationToken)
    {
        LogStartMessage(_logger);

        //var key = _configuration["CHROMACONTROL_KEY_SYNAPSE"];
        //key =  "aaa";
        var key = GetSynapseKey();
        var parseResult = Guid.TryParse(key, out var appId);

        var startResult = parseResult
            ? _synapse.StartService(appId)
            : _synapse.StartService(new());

        if (startResult != SynapseResult.Success)
        {
            LogStartErrorMessage(_logger);
        }

        return Task.CompletedTask;
    }

    /// <summary>
    /// Stops the service.
    /// </summary>
    /// <param name="cancellationToken">The <see cref="CancellationToken"/>.</param>
    /// <returns>A <see cref="Task"/> representing the worker stopping.</returns>
    public Task StopAsync(CancellationToken cancellationToken)
    {
        LogStopMessage(_logger);

        _synapse.StopService();

        return Task.CompletedTask;
    }
}
