﻿using System;
using System.Runtime.Serialization;

namespace Wexflow.Core.Service.Contracts
{
    public enum LaunchType
    {
        Startup,
        Trigger,
        Periodic
    }

    [DataContract]
    public class WorkflowInfo:IComparable
    {
        [DataMember]
        public int Id { get; private set; }
        [DataMember]
        public string Name { get; private set; }
        [DataMember]
        public LaunchType LaunchType { get; private set; }
        [DataMember]
        public bool IsEnabled { get; private set; }
        [DataMember]
        public string Description { get; private set; }
        [DataMember]
        public bool IsRunning { get; set; }
        [DataMember]
        public bool IsPaused { get; set; }
        [DataMember]
        public string Period { get; set; }
        [DataMember]
        public string Path { get; set; }
        [DataMember]
        public bool IsExecutionGraphEmpty { get; set; }

        public WorkflowInfo(int id, string name, LaunchType launchType, bool isEnabled, string desc, bool isRunning, bool isPaused, string period, string path, bool isExecutionGraphEmpty)
        {
            Id = id;
            Name = name;
            LaunchType = launchType;
            IsEnabled = isEnabled;
            Description = desc;
            IsRunning = isRunning;
            IsPaused = isPaused;
            Period = period;
            Path = path;
            IsExecutionGraphEmpty = isExecutionGraphEmpty;
        }

        public int CompareTo(object obj)
        {
            var wfi = (WorkflowInfo)obj;
            return wfi.Id.CompareTo(Id);
        }
    }
}
