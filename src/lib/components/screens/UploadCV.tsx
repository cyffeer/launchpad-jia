// Clean UploadCV implementation
"use client";
import Loader from "@/lib/components/commonV2/Loader";
import styles from "@/lib/styles/screens/uploadCV.module.scss";
import { useAppContext } from "@/lib/context/ContextV2";
import { assetConstants, pathConstants } from "@/lib/utils/constantsV2";
import { checkFile } from "@/lib/utils/helpersV2";
import { CORE_API_URL } from "@/lib/Utils";
import axios from "axios";
import Markdown from "react-markdown";
import { useEffect, useRef, useState } from "react";

export default function UploadCV() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user, setModalType } = useAppContext();
  const [buildingCV, setBuildingCV] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [digitalCV, setDigitalCV] = useState<string | null>(null);
  const [editingCV, setEditingCV] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [interview, setInterview] = useState<any>(null);
  const [screeningResult, setScreeningResult] = useState<any>(null);
  const [userCV, setUserCV] = useState<Record<string,string> | null>(null);
  const cvSections = ["Introduction","Current Position","Contact Info","Skills","Experience","Education","Projects","Certifications","Awards"];
  const steps = ["Submit CV","Pre-screening Questions","Review"];
  const stepStatus = ["Completed","Pending","In Progress"];
  const [preScreeningAnswers, setPreScreeningAnswers] = useState<Record<string,any>>({});
  const [submittingPreScreen, setSubmittingPreScreen] = useState(false);

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer.files);
  }

  function handleEditCV(section) {
    setEditingCV(section);

    if (section != null) {
      setTimeout(() => {
        const sectionDetails = document.getElementById(section);

        if (sectionDetails) {
          sectionDetails.focus();
        }
      }, 100);
    }
  }

  function handleFile(files) {
    const file = checkFile(files);

    if (file) {
      setFile(file);
      handleFileSubmit(file);
    }
  }

  function handleFileChange(e) {
    const files = e.target.files;

    if (files.length > 0) {
      handleFile(files);
    }
  }

  function handleModal() {
    setModalType("jobDescription");
  }

  function handleRedirection(type) {
    if (type == "dashboard") {
      window.location.href = pathConstants.dashboard;
    }

    if (type == "interview") {
      sessionStorage.setItem("interviewRedirection", pathConstants.dashboard);
      window.location.href = `/interview/${interview.interviewID}`;
    }
  }

  function handleRemoveFile(e) {
    e.stopPropagation();
    e.target.value = "";

    setFile(null);
    setHasChanges(false);
    setUserCV(null);

    const storedCV = localStorage.getItem("userCV");

    if (storedCV != "null") {
      setDigitalCV(storedCV);
    } else {
      setDigitalCV(null);
    }
  }

  function handleReviewCV() {
    const parsedUserCV = JSON.parse(digitalCV);
    const formattedCV = {};

    cvSections.forEach((section, index) => {
      formattedCV[section] = parsedUserCV.digitalCV[index].content.trim() || "";
    });

    setFile(parsedUserCV.fileInfo);
    setUserCV(formattedCV);
  }

  function handleUploadCV() {
    fileInputRef.current.click();
  }

  function processState(index, isAdvance = false) {
    const currentStepIndex = steps.indexOf(currentStep);

    if (currentStepIndex == index) {
      if (index == stepStatus.length - 1) {
        return stepStatus[0];
      }

      return isAdvance || userCV || buildingCV ? stepStatus[2] : stepStatus[1];
    }

    if (currentStepIndex > index) {
      return stepStatus[0];
    }

    return stepStatus[1];
  }

  useEffect(() => {
  const storedSelectedCareer = sessionStorage.getItem("selectedCareer");
    const storedCV = localStorage.getItem("userCV");

    if (storedCV && storedCV != "null") {
      setDigitalCV(storedCV);
    }

    if (storedSelectedCareer) {
      const parseStoredSelectedCareer = JSON.parse(storedSelectedCareer);
      fetchInterview(parseStoredSelectedCareer.id);
    } else {
      alert("No application is currently being managed.");
      window.location.href = pathConstants.dashboard;
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("hasChanges", JSON.stringify(hasChanges));
  }, [hasChanges]);

  function fetchInterview(interviewID) {
    axios({
      method: "POST",
      url: "/api/job-portal/fetch-interviews",
      data: { email: user.email, interviewID },
    })
      .then((res) => {
        const result = res.data;

        if (result.error) {
          alert(result.error);
          window.location.href = pathConstants.dashboard;
        } else {
          if (result[0].cvStatus) {
            alert("This application has already been processed.");
            window.location.href = pathConstants.dashboard;
          } else {
            // Always start at Submit CV per design
            setCurrentStep("Submit CV");
            setInterview(result[0]);
            setLoading(false);
          }
        }
      })
      .catch((err) => {
        alert("Error fetching existing applied jobs.");
        window.location.href = pathConstants.dashboard;
        console.log(err);
      });
  }

  function handleCVScreen() {
    if (editingCV != null) {
      alert("Please save the changes first.");
      return false;
    }

    // Accept partially filled CV; only block if literally every section is empty.
    const allEmpty = Object.values(userCV).every((value: any) => !value || value.trim() === "");
    if (allEmpty) {
      alert("Your CV appears empty. Please add at least one detail before submitting.");
      return false;
    }

    let parsedDigitalCV = {
      errorRemarks: null,
      digitalCV: null,
    };

    if (digitalCV) {
      parsedDigitalCV = JSON.parse(digitalCV);
      // Allow proceeding even if some sections are missing; keep a soft console notice only.
      if (parsedDigitalCV.errorRemarks) {
        console.warn("Digitalized CV reported issues but proceeding:", parsedDigitalCV.errorRemarks);
      }
    }

  // After saving CV, move to Pre-Screening if questions exist; otherwise go straight to Review and run screening in the background.

    if (hasChanges) {
      const formattedUserCV = cvSections.map((section) => ({
        name: section,
        content: userCV[section]?.trim() || "",
      }));

      parsedDigitalCV.digitalCV = formattedUserCV;

      const data = {
        name: user.name,
        cvData: parsedDigitalCV,
        email: user.email,
        fileInfo: null,
      };

      if (file) {
        data.fileInfo = {
          name: file.name,
          size: file.size,
          type: file.type,
        };
      }

      axios({
        method: "POST",
        url: `/api/whitecloak/save-cv`,
        data,
      })
        .then(() => {
          localStorage.setItem(
            "userCV",
            JSON.stringify({ ...data, ...data.cvData })
          );
        })
        .catch((err) => {
          alert("Error saving CV. Please try again.");
          setCurrentStep(steps[0]);
          console.log(err);
        });
    }

    setHasChanges(true);

    const hasPre = Array.isArray(interview?.preScreeningQuestions) && interview.preScreeningQuestions.length > 0;
    if (hasPre && !(Array.isArray(interview?.preScreeningAnswers) && interview.preScreeningAnswers.length > 0)) {
      setCurrentStep(steps[1]);
      setHasChanges(false);
      return;
    }

    // No pre-screening: run screening in background then show Review
    setCurrentStep(steps[2]);
    axios({
      url: "/api/whitecloak/screen-cv",
      method: "POST",
      data: {
        interviewID: interview.interviewID,
        userEmail: user.email,
      },
    })
      .then((res) => {
        const result = res.data;
        if (result.error) {
          alert(result.message);
          setCurrentStep(steps[0]);
        } else {
          setScreeningResult(result);
        }
      })
      .catch((err) => {
        alert("Error screening CV. Please try again.");
        setCurrentStep(steps[0]);
        console.log(err);
      })
      .finally(() => setHasChanges(false));
  }

  function handleFileSubmit(file) {
    setBuildingCV(true);
    setHasChanges(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fName", file.name);
    formData.append("userEmail", user.email);

    axios({
      method: "POST",
      url: `${CORE_API_URL}/upload-cv`,
      data: formData,
    })
      .then((res) => {
        axios({
          method: "POST",
          url: `/api/whitecloak/digitalize-cv`,
          data: { chunks: res.data.cvChunks },
        })
          .then((res) => {
            const result = res.data.result;
            const parsedUserCV = JSON.parse(result);
            const formattedCV = {};

            cvSections.forEach((section, index) => {
              formattedCV[section] =
                parsedUserCV.digitalCV[index].content.trim();
            });

            setDigitalCV(result);
            setUserCV(formattedCV);
          })
          .catch((err) => {
            alert("Error building CV. Please try again.");
            console.log(err);
          })
          .finally(() => {
            setBuildingCV(false);
          });
      })
      .catch((err) => {
        alert("Error building CV. Please try again.");
        setBuildingCV(false);
        console.log(err);
      });
  }

  function handlePreScreeningInput(q, value, checked=false) {
    setPreScreeningAnswers((prev) => {
      const existing = prev[q.id] || { questionId: q.id, question: q.question, type: q.type, answer: q.type === 'Checkboxes' ? [] : '' };
      if (q.type === 'Checkboxes') {
        let arr = Array.isArray(existing.answer) ? [...existing.answer] : [];
        if (checked) {
          if (!arr.includes(value)) arr.push(value);
        } else {
          arr = arr.filter(v => v !== value);
        }
        existing.answer = arr;
      } else {
        existing.answer = value;
      }
      return { ...prev, [q.id]: existing };
    });
  }

  function handlePreScreeningRange(q, field, value) {
    setPreScreeningAnswers(prev => {
      const existing = prev[q.id] || { questionId: q.id, question: q.question, type: q.type, answer: { min: '', max: '', currency: 'PHP' } };
      if (!existing.answer || typeof existing.answer !== 'object' || Array.isArray(existing.answer)) {
        existing.answer = { min: '', max: '', currency: 'PHP' };
      }
      existing.answer[field] = value;
      return { ...prev, [q.id]: existing };
    });
  }

  function submitPreScreening() {
    if (!interview) return;
    const questions = interview.preScreeningQuestions || [];
    // Basic validation: ensure all dropdown / required inputs have answer (treat all as required for now)
    for (const q of questions) {
      const a = preScreeningAnswers[q.id];
      if (!a || (Array.isArray(a.answer) ? a.answer.length === 0 : !String(a.answer).trim())) {
        alert("Please answer all pre-screening questions.");
        return;
      }
    }
    setSubmittingPreScreen(true);
    axios.post('/api/submit-pre-screening', {
      interviewID: interview.interviewID,
      answers: Object.values(preScreeningAnswers)
    }).then(res => {
      // Update interview record locally
      const updated = { ...interview, preScreeningAnswers: res.data.preScreeningAnswers, status: 'For CV Upload' };
      setInterview(updated);
      // Move to Review and trigger screening in background
      setCurrentStep(steps[2]);
      axios({
        url: "/api/whitecloak/screen-cv",
        method: "POST",
        data: { interviewID: updated.interviewID, userEmail: user.email },
      })
        .then((resp) => setScreeningResult(resp.data))
        .catch((err) => {
          console.error(err);
          alert('Error screening CV. Please try again.');
          setCurrentStep(steps[0]);
        });
    }).catch(err => {
      console.error(err);
      alert('Failed to submit answers. Please try again.');
    }).finally(()=> setSubmittingPreScreen(false));
  }

  return (
    <>
      {loading && <Loader loaderData="" loaderType="" />}
      {interview && (
        <div className={styles.uploadCVContainer}>
          <div className={styles.uploadCVHeader}>
            {interview.organization?.image && <img alt="" src={interview.organization.image} />}
            <div className={styles.textContainer}>
              <span className={styles.tag}>You're applying for</span>
              <span className={styles.title}>{interview.jobTitle}</span>
              {interview.organization?.name && <span className={styles.name}>{interview.organization.name}</span>}
              <span className={styles.description} onClick={handleModal}>View job description</span>
            </div>
          </div>
          <div className={styles.stepContainer}>
            <div className={styles.step}>
              {steps.map((_, i) => (
                <div className={styles.stepBar} key={i}>
                  <img alt="" src={assetConstants[processState(i, true).toLowerCase().replace(" ", "_") as keyof typeof assetConstants]} />
                  {i < steps.length - 1 && <hr className={styles[processState(i).toLowerCase().replace(" ", "_") as keyof typeof styles]} />}
                </div>
              ))}
            </div>
            <div className={styles.step}>
              {steps.map((s,i) => (
                <span key={s} className={`${styles.stepDetails} ${styles[processState(i, true).toLowerCase().replace(" ", "_") as keyof typeof styles]}`}>{s}</span>
              ))}
            </div>
          </div>
          {currentStep === steps[0] && (
            <>
              {!buildingCV && !userCV && !file && (
                <div className={styles.cvManageContainer}>
                  <div className={styles.cvContainer} onDragOver={handleDragOver} onDrop={handleDrop}>
                    <img alt="" src={assetConstants.uploadV2} />
                    <button onClick={handleUploadCV}>Upload CV</button>
                    <span>Choose or drag and drop a file here. Our AI tools will automatically pre-fill your CV and also check how well it matches the role.</span>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{display:'none'}} onChange={handleFileChange} />
                  <div className={styles.cvContainer}>
                    <img alt="" src={assetConstants.review} />
                    <button className={digitalCV ? '' : 'disabled'} disabled={!digitalCV} onClick={handleReviewCV}>Review Current CV</button>
                    <span>Already uploaded a CV? Take a moment to review your details before we proceed.</span>
                  </div>
                </div>
              )}
              {buildingCV && file && (
                <div className={styles.cvDetailsContainer}>
                  <div className={styles.gradient}>
                    <div className={styles.cvDetailsCard}>
                      <span className={styles.sectionTitle}><img alt="" src={assetConstants.account} />Submit CV</span>
                      <div className={styles.detailsContainer}>
                        <span className={styles.fileTitle}><img alt="" src={assetConstants.completed} />{file.name}</span>
                        <div className={styles.loadingContainer}>
                          <img alt="" src={assetConstants.loading} />
                          <div className={styles.textContainer}>
                            <span className={styles.title}>Extracting information from your CV...</span>
                            <span className={styles.description}>Jia is building your profile...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {!buildingCV && userCV && (
                <div className={styles.cvDetailsContainer}>
                  <div className={styles.gradient}>
                    <div className={styles.cvDetailsCard}>
                      <span className={styles.sectionTitle}>
                        <img alt="" src={assetConstants.account} />Submit CV
                        <div className={styles.editIcon}>
                          <img alt="" src={file ? assetConstants.xV2 : assetConstants.save} onClick={file ? handleRemoveFile : handleUploadCV} />
                        </div>
                        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{display:'none'}} onChange={handleFileChange} />
                      </span>
                      <div className={styles.detailsContainer}>
                        {file ? <span className={styles.fileTitle}><img alt="" src={assetConstants.completed} />{file.name}</span> : <span className={styles.fileTitle}><img alt="" src={assetConstants.fileV2} />You can also upload your CV and let our AI automatically fill in your profile information.</span>}
                      </div>
                    </div>
                  </div>
                  {cvSections.map(section => (
                    <div key={section} className={styles.gradient}>
                      <div className={styles.cvDetailsCard}>
                        <span className={styles.sectionTitle}>{section}
                          <div className={styles.editIcon}>
                            <img alt="" src={editingCV === section ? assetConstants.save : assetConstants.edit} onClick={() => handleEditCV(editingCV === section ? null : section)} />
                          </div>
                        </span>
                        <div className={styles.detailsContainer}>
                          {editingCV === section ? (
                            <textarea id={section} placeholder="Upload your CV to auto-fill this section." value={userCV?.[section] || ''} onBlur={(e)=> e.target.placeholder = 'Upload your CV to auto-fill this section.'} onChange={(e)=> { setUserCV({...userCV!, [section]: e.target.value}); setHasChanges(true); }} onFocus={(e)=> e.target.placeholder=''} />
                          ) : (
                            <span className={`${styles.sectionDetails} ${userCV?.[section]?.trim() ? styles.withDetails : ''}`}>
                              <Markdown>{userCV?.[section]?.trim() || 'Upload your CV to auto-fill this section.'}</Markdown>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={handleCVScreen}>Submit CV</button>
                </div>
              )}
            </>
          )}
          {currentStep === steps[1] && (
            <div className={styles.cvDetailsContainer}>
              <div className={styles.gradient}>
                <div className={styles.cvDetailsCard}>
                  <span className={styles.sectionTitle}><img alt="" src={assetConstants.account} />Pre-screening Questions</span>
                  <div className={styles.detailsContainer}>
                    <div style={{marginBottom:8}}>
                      <div style={{fontSize:16,fontWeight:700,color:'#181D27'}}>Quick Pre-screening</div>
                      <div style={{fontSize:12,color:'#667085'}}>Just a few short questions to help your recruiters assess you faster. Takes less than a minute.</div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:12}}>
                      {(interview.preScreeningQuestions||[]).map((q:any)=>(
                        <div key={q.id} className={styles.psCardGradient}>
                          <div className={styles.psCard}>
                            <div className={styles.psBody}>
                              <span className={styles.psQuestionTitle}>{q.question}</span>
                            {q.type === 'Short Answer' && (
                              <input
                                className="form-control"
                                value={(preScreeningAnswers[q.id]?.answer ?? '') as string}
                                onChange={(e)=>handlePreScreeningInput(q,e.target.value)}
                              />
                            )}
                            {q.type === 'Long Answer' && (
                              <textarea
                                className="form-control"
                                rows={4}
                                value={(preScreeningAnswers[q.id]?.answer ?? '') as string}
                                onChange={(e)=>handlePreScreeningInput(q,e.target.value)}
                              />
                            )}
                            {q.type === 'Dropdown' && (
                              <select
                                className="form-control"
                                value={(preScreeningAnswers[q.id]?.answer ?? '') as string}
                                onChange={(e)=>handlePreScreeningInput(q,e.target.value)}
                              >
                                <option value="" disabled>Choose...</option>
                                {(q.options||[]).map((opt:string,i:number)=><option key={i}>{opt}</option>)}
                              </select>
                            )}
                            {q.type === 'Checkboxes' && (
                              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                                {(q.options||[]).map((opt:string,i:number)=>(
                                  <label key={i} style={{fontSize:13,display:'flex',gap:6,alignItems:'center'}}>
                                    <input
                                      type="checkbox"
                                      checked={Array.isArray(preScreeningAnswers[q.id]?.answer) ? preScreeningAnswers[q.id].answer.includes(opt) : false}
                                      onChange={(e)=>handlePreScreeningInput(q,opt,e.target.checked)}
                                    /> {opt}
                                  </label>
                                ))}
                              </div>
                            )}
                            {(q.type==='Salary Range'||q.type==='Range') && (
                              <div style={{display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
                                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                                  <label style={{fontSize:12,color:'#667085'}}>Minimum Salary</label>
                                  <div style={{position:'relative'}}>
                                    <span style={{position:'absolute',left:10,top:8,fontSize:13,color:'#667085'}}>
                                      {((preScreeningAnswers[q.id]?.answer?.currency)||'PHP') === 'PHP' ? '₱' : ((preScreeningAnswers[q.id]?.answer?.currency)||'PHP') === 'USD' ? '$' : ''}
                                    </span>
                                    <input
                                      className="form-control"
                                      style={{paddingLeft:24,minWidth:180}}
                                      value={(preScreeningAnswers[q.id]?.answer?.min ?? '') as string}
                                      onChange={(e)=>handlePreScreeningRange(q,'min',e.target.value)}
                                    />
                                  </div>
                                </div>
                                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                                  <label style={{fontSize:12,color:'#667085'}}>Maximum Salary</label>
                                  <div style={{position:'relative'}}>
                                    <span style={{position:'absolute',left:10,top:8,fontSize:13,color:'#667085'}}>
                                      {((preScreeningAnswers[q.id]?.answer?.currency)||'PHP') === 'PHP' ? '₱' : ((preScreeningAnswers[q.id]?.answer?.currency)||'PHP') === 'USD' ? '$' : ''}
                                    </span>
                                    <input
                                      className="form-control"
                                      style={{paddingLeft:24,minWidth:180}}
                                      value={(preScreeningAnswers[q.id]?.answer?.max ?? '') as string}
                                      onChange={(e)=>handlePreScreeningRange(q,'max',e.target.value)}
                                    />
                                  </div>
                                </div>
                                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                                  <label style={{fontSize:12,color:'#667085'}}>Currency</label>
                                  <select
                                    className="form-control"
                                    style={{minWidth:110}}
                                    value={(preScreeningAnswers[q.id]?.answer?.currency ?? 'PHP') as string}
                                    onChange={(e)=>handlePreScreeningRange(q,'currency',e.target.value)}
                                  >
                                    <option value="PHP">PHP</option>
                                    <option value="USD">USD</option>
                                  </select>
                                </div>
                              </div>
                            )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}>
                      <button disabled={submittingPreScreen} onClick={submitPreScreening} className={submittingPreScreen? 'disabled': ''} style={{padding:'8px 18px',borderRadius:9999}}>{submittingPreScreen? 'Submitting...' : 'Continue  →'}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {currentStep === steps[2] && screeningResult && (
            <div className={styles.cvResultContainer}>
              {screeningResult.applicationStatus === 'Dropped' ? (
                <>
                  <img alt="" src={assetConstants.userRejected} />
                  <span className={styles.title}>This role may not be the best match.</span>
                  <span className={styles.description}>Based on your CV, it looks like this position might not be the right fit at the moment.</span>
                  <br />
                  <span className={styles.description}>Review your screening results and see recommended next steps.</span>
                  <div className={styles.buttonContainer}><button onClick={()=>handleRedirection('dashboard')}>View Dashboard</button></div>
                </>
              ) : screeningResult.status === 'For AI Interview' ? (
                <>
                  <img alt="" src={assetConstants.checkV3} />
                  <span className={styles.title}>Hooray! You’re a strong fit for this role.</span>
                  <span className={styles.description}>Jia thinks you might be a great match.</span>
                  <br />
                  <span className={`${styles.description} ${styles.bold}`}>Ready to take the next step?</span>
                  <span className={styles.description}>You may start your AI interview now.</span>
                  <div className={styles.buttonContainer}>
                    <button onClick={()=>handleRedirection('interview')}>Start AI Interview</button>
                    <button className="secondaryBtn" onClick={()=>handleRedirection('dashboard')}>View Dashboard</button>
                  </div>
                </>
              ) : (
                <>
                  <img alt="" src={assetConstants.userCheck} />
                  <span className={styles.title}>Your CV is now being reviewed by the hiring team.</span>
                  <span className={styles.description}>We’ll be in touch soon with updates about your application.</span>
                  <div className={styles.buttonContainer}><button onClick={()=>handleRedirection('dashboard')}>View Dashboard</button></div>
                </>
              )}
            </div>
          )}
          {currentStep === steps[2] && !screeningResult && (
            <div className={styles.cvScreeningContainer}>
              <img alt="" src={assetConstants.loading} />
              <span className={styles.title}>Finishing checks...</span>
              <span className={styles.description}>We’re reviewing your application. This will just take a moment.</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
