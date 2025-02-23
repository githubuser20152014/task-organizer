import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { PlusCircle, X, Pencil, Check, GripVertical, Trash2, ArrowRight, CheckCircle2, Circle } from 'lucide-react';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  fromProject?: string;
  originalText?: string;
}

interface Projects {
  [key: string]: Task[];
}

interface TaskItemProps {
  task: Task;
  projectName?: string | null;
  showMoveToNow?: boolean;
}

interface TaskGroups {
  [key: string]: Task[];
}

const TaskOrganizer = () => {
  // Initialize state from localStorage or use default empty values
  const [brainDump, setBrainDump] = useState<Task[]>(() => {
    const saved = localStorage.getItem('mindflow_brainDump');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [projects, setProjects] = useState<Projects>({});
  
  const [projectOrder, setProjectOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('mindflow_projectOrder');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [nowList, setNowList] = useState<Task[]>(() => {
    const saved = localStorage.getItem('mindflow_nowList');
    return saved ? JSON.parse(saved) : [];
  });
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('mindflow_notes');
    return saved ? JSON.parse(saved) : '';
  });

  // Save notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('mindflow_notes', JSON.stringify(notes));
  }, [notes]);
  useEffect(() => {
    localStorage.setItem('mindflow_brainDump', JSON.stringify(brainDump));
  }, [brainDump]);

  useEffect(() => {
    localStorage.setItem('mindflow_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('mindflow_projectOrder', JSON.stringify(projectOrder));
  }, [projectOrder]);

  useEffect(() => {
    localStorage.setItem('mindflow_nowList', JSON.stringify(nowList));
  }, [nowList]);
  const [inputValue, setInputValue] = useState<string>('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [draggedProject, setDraggedProject] = useState<string | null>(null);

  const parseTask = (text: string) => {
    const hashtagRegex = /#(\w+)/g;
    const hashtags = [...text.matchAll(hashtagRegex)].map(match => match[1]);
    const cleanText = text.replace(hashtagRegex, '').trim();
    return { text: cleanText, projects: hashtags };
  };

  const addTask = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue) {
      const { text, projects: taskProjects } = parseTask(trimmedValue);
      const newTask = {
        id: Date.now().toString(),
        text,
        originalText: trimmedValue,
        completed: false
      };

      if (taskProjects.length > 0) {
        setProjects(currentProjects => {
          const newProjects = { ...currentProjects };
          taskProjects.forEach(project => {
            if (!newProjects[project]) {
              newProjects[project] = [];
              setProjectOrder(current => [...current, project]);
            }
            newProjects[project] = [...newProjects[project], newTask];
          });
          return newProjects;
        });
      } else {
        setBrainDump(current => [...current, newTask]);
      }
      setInputValue('');
    }
  };

  const moveToNow = (task: Task, projectName: string | null = null) => {
    setNowList(current => [...current, {
      ...task,
      fromProject: projectName || undefined
    }]);

    if (projectName) {
      setProjects(current => {
        const newProjects = { ...current };
        newProjects[projectName] = newProjects[projectName].filter(t => t.id !== task.id);
        if (newProjects[projectName].length === 0) {
          delete newProjects[projectName];
          setProjectOrder(current => current.filter(p => p !== projectName));
        }
        return newProjects;
      });
    } else {
      setBrainDump(current => current.filter(t => t.id !== task.id));
    }
  };

  const deleteProject = (projectName: string) => {
    const projectTasks = projects[projectName] || [];
    setBrainDump(current => [
      ...current,
      ...projectTasks.map(task => ({
        ...task,
        text: task.text,
        originalText: task.text
      }))
    ]);

    setProjects(current => {
      const { [projectName]: _, ...rest } = current;
      return rest;
    });

    setProjectOrder(current => current.filter(p => p !== projectName));
  };

  const handleDragStart = (projectName: string) => {
    setDraggedProject(projectName);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, projectName: string) => {
    e.preventDefault();
    const draggedOverProject = projectName;
    
    if (!draggedProject || draggedProject === draggedOverProject) return;
    
    const draggedProjectIndex = projectOrder.indexOf(draggedProject);
    const draggedOverProjectIndex = projectOrder.indexOf(draggedOverProject);
    
    if (draggedProjectIndex === -1 || draggedOverProjectIndex === -1) return;
    
    setProjectOrder(currentOrder => {
      const newOrder = [...currentOrder];
      newOrder.splice(draggedProjectIndex, 1);
      newOrder.splice(draggedOverProjectIndex, 0, draggedProject);
      return newOrder;
    });
  };

  const handleDragEnd = () => {
    setDraggedProject(null);
  };

  const startEdit = (task: Task) => {
    console.log('Starting edit for task:', task); // Debug log
    setEditId(task.id);
    setEditValue(task.originalText || task.text);
  };

  const saveEdit = () => {
    if (!editId) return;

    if (editValue.trim()) {
      const { text, projects: taskProjects } = parseTask(editValue);
      const updatedTask: Task = {
        id: editId,
        text,
        originalText: editValue,
        completed: false
      };

      // Remove from Now list if it exists there
      setNowList(current => current.filter(task => task.id !== editId));

      // Remove task from previous location
      setBrainDump(current => current.filter(task => task.id !== editId));
      setProjects(current => {
        const newProjects = { ...current };
        Object.keys(newProjects).forEach(project => {
          newProjects[project] = newProjects[project].filter(task => task.id !== editId);
          if (newProjects[project].length === 0) {
            delete newProjects[project];
            setProjectOrder(current => current.filter(p => p !== project));
          }
        });
        return newProjects;
      });

      // Add to new location
      if (taskProjects.length > 0) {
        setProjects(current => {
          const newProjects = { ...current };
          taskProjects.forEach(project => {
            if (!newProjects[project]) {
              newProjects[project] = [];
              setProjectOrder(current => [...current, project]);
            }
            newProjects[project] = [...newProjects[project], updatedTask];
          });
          return newProjects;
        });
      } else {
        setBrainDump(current => [...current, updatedTask]);
      }
    }
    setEditId(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditValue('');
  };

  const removeTask = (taskId: string) => {
    setBrainDump(current => current.filter(task => task.id !== taskId));
    setProjects(current => {
      const newProjects = { ...current };
      Object.keys(newProjects).forEach(project => {
        newProjects[project] = newProjects[project].filter(task => task.id !== taskId);
        if (newProjects[project].length === 0) {
          delete newProjects[project];
          setProjectOrder(current => current.filter(p => p !== project));
        }
      });
      return newProjects;
    });
    setNowList(current => current.filter(task => task.id !== taskId));
  };

  const toggleComplete = (taskId: string, projectName: string | null = null) => {
    // Toggle in brain dump
    setBrainDump(current =>
      current.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );

    // Toggle in projects
    setProjects(current => {
      const newProjects = { ...current };
      Object.keys(newProjects).forEach(project => {
        newProjects[project] = newProjects[project].map(task =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        );
      });
      return newProjects;
    });

    // Toggle in now list
    setNowList(current =>
      current.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const TaskItem = ({ task, projectName = null, showMoveToNow = true }: TaskItemProps) => {
    const isEditing = editId === task.id;
    
    return (
      <li className="flex items-center gap-2 p-3 bg-white/50 rounded-lg border border-gray-100 shadow-sm transition-all duration-200 hover:shadow-md">
        {isEditing ? (
          <div className="flex gap-2 w-full">
            <Input
              value={editValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              className="flex-1 bg-white/80"
              autoFocus
            />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={saveEdit}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={cancelEdit}
              className="text-gray-400 hover:text-gray-500 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleComplete(task.id, projectName)}
                className={`p-1 hover:bg-gray-50 ${task.completed ? 'text-green-500' : 'text-gray-300'}`}
              >
                {task.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
              </Button>
              <span className={`${task.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                {task.text}
              </span>
              {task.fromProject && !showMoveToNow && (
                <span className="ml-2 text-sm text-blue-400">#{task.fromProject}</span>
              )}
            </div>
            {showMoveToNow && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveToNow(task, projectName)}
                className="text-blue-400 hover:text-blue-600 hover:bg-blue-50"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setEditValue(task.originalText || task.text);
                setEditId(task.id);
              }}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => removeTask(task.id)}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </li>
    );
  };

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extralight tracking-wide text-gray-600 mb-2 opacity-90" style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}>
          Mind Flow
        </h1>
        <p className="text-gray-400 font-light tracking-wider">Organize your mind, find your flow</p>
      </div>
      <div className="flex gap-8 mb-8">
        {/* Original containers remain the same */}
        {/* Brain Dump Column */}
        <div className="w-1/3">
          <Card className="backdrop-blur-sm bg-white/80 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-normal text-gray-700">Brain Dump</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Input
                  value={inputValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                  placeholder="Add task (use #project to assign)..."
                  className="flex-1 bg-white/80 border-gray-200 focus:ring-blue-100"
                  onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addTask()}
                />
                <Button 
                  onClick={addTask} 
                  type="button"
                  className="bg-blue-400 hover:bg-blue-500 text-white transition-colors duration-200"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              
              <ul className="space-y-3">
                {brainDump.map(task => (
                  <TaskItem key={task.id} task={task} showMoveToNow={true} />
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Projects Column */}
        <div className="w-1/3">
          <div className="flex flex-col gap-6">
            {projectOrder.map(projectName => (
              projects[projectName] && projects[projectName].length > 0 ? (
                <div
                  key={projectName}
                  draggable
                  onDragStart={(e) => handleDragStart(projectName)}
                  onDragOver={(e) => handleDragOver(e, projectName)}
                  onDragEnd={handleDragEnd}
                  className={`transition-opacity duration-200 ${draggedProject === projectName ? 'opacity-50' : ''}`}
                >
                  <Card className="backdrop-blur-sm bg-white/80 border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="flex items-center gap-4">
                        <div className="cursor-grab">
                          <GripVertical className="h-5 w-5 text-gray-400" />
                        </div>
                        <CardTitle className="text-xl font-normal text-gray-700">{projectName}</CardTitle>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-200"
                        onClick={() => deleteProject(projectName)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {projects[projectName].map(task => (
                          <TaskItem 
                            key={task.id} 
                            task={task} 
                            projectName={projectName}
                            showMoveToNow={true}
                          />
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              ) : null
            ))}
          </div>
        </div>

        {/* Now Column */}
        <div className="w-1/3">
          <Card className="backdrop-blur-sm bg-white/80 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-normal text-gray-700">Now</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Tasks without project */}
              {nowList.filter(task => !task.fromProject).length > 0 && (
                <div className="mb-6">
                  <ul className="space-y-3">
                    {nowList
                      .filter(task => !task.fromProject)
                      .map(task => (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          showMoveToNow={false}
                        />
                      ))}
                  </ul>
                </div>
              )}

              {/* Group tasks by project */}
              {Object.entries(
                nowList
                  .filter(task => task.fromProject)
                  .reduce<TaskGroups>((groups, task) => {
                    const project = task.fromProject;
                    if (project) {
                      if (!groups[project]) {
                        groups[project] = [];
                      }
                      groups[project].push(task);
                    }
                    return groups;
                  }, {})
              ).map(([projectName, tasks]) => (
                <div key={projectName} className="mb-6">
                  <div className="text-sm font-normal text-blue-400 mb-3 pl-1">
                    #{projectName}
                  </div>
                  <ul className="space-y-3">
                    {tasks.map(task => (
                      <TaskItem 
                        key={task.id} 
                        task={{...task, fromProject: undefined}}
                        showMoveToNow={false}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Notes Section */}
      <div className="w-full">
        <Card className="backdrop-blur-sm bg-white/80 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-normal text-gray-700">Notes & Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Track your progress, add notes, or leave reminders for yourself..."
              className="w-full h-32 p-4 rounded-lg border border-gray-200 bg-white/80 focus:ring-blue-100 focus:border-blue-200 resize-y transition-colors duration-200"
              style={{ minHeight: '8rem' }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TaskOrganizer;