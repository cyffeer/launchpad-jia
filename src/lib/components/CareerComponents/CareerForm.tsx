"use client"

import { useEffect, useRef, useState } from "react";
import InterviewQuestionGeneratorV2 from "./InterviewQuestionGeneratorV2";
import RichTextEditor from "@/lib/components/CareerComponents/RichTextEditor";
import CustomDropdown from "@/lib/components/CareerComponents/CustomDropdown";
import philippineCitiesAndProvinces from "../../../../public/philippines-locations.json";
import { candidateActionToast, errorToast } from "@/lib/Utils";
import { useAppContext } from "@/lib/context/AppContext";
import axios from "axios";
import CareerActionModal from "./CareerActionModal";
import FullScreenLoadingAnimation from "./FullScreenLoadingAnimation";
// Segmented form addition: Team Access step component
import TeamAccessSection from "./TeamAccessSection";
import PreScreeningSection from "./PreScreeningSection";
import AIInterviewSetupSection from "./AIInterviewSetupSection";
import PipelineStagesSection, { defaultPipeline } from "./PipelineStagesSection";
import ReviewCareerSection from "./ReviewCareerSection";
  // Setting List icons
  const screeningSettingList = [
    {
        name: "Good Fit and above",
        icon: "la la-check",
    },
    {
        name: "Only Strong Fit",
        icon: "la la-check-double",
    },
    {
        name: "No Automatic Promotion",
        icon: "la la-times",
    },
];
const workSetupOptions = [
    {
        name: "Fully Remote",
    },
    {
        name: "Onsite",
    },
    {
        name: "Hybrid",
    },
];

const employmentTypeOptions = [
    {
        name: "Full-Time",
    },
    {
        name: "Part-Time",
    },
];

export default function CareerForm({ career, formType, setShowEditModal }: { career?: any, formType: string, setShowEditModal?: (show: boolean) => void }) {
    const { user, orgID } = useAppContext();
    const [jobTitle, setJobTitle] = useState(career?.jobTitle || "");
    const [description, setDescription] = useState(career?.description || "");
    const [workSetup, setWorkSetup] = useState(career?.workSetup || "");
    const [workSetupRemarks, setWorkSetupRemarks] = useState(career?.workSetupRemarks || "");
    const [screeningSetting, setScreeningSetting] = useState(career?.screeningSetting || "Good Fit and above");
    const [employmentType, setEmploymentType] = useState(career?.employmentType || "Full-Time");
    const [requireVideo, setRequireVideo] = useState(career?.requireVideo || true);
    const [salaryNegotiable, setSalaryNegotiable] = useState(career?.salaryNegotiable || true);
    const [minimumSalary, setMinimumSalary] = useState(career?.minimumSalary || "");
    const [maximumSalary, setMaximumSalary] = useState(career?.maximumSalary || "");
    const [questions, setQuestions] = useState(career?.questions || [
      {
        id: 1,
        category: "CV Validation / Experience",
        questionCountToAsk: null,
        questions: [],
      },
      {
        id: 2,
        category: "Technical",
        questionCountToAsk: null,
        questions: [],
      },
      {
        id: 3,
        category: "Behavioral",
        questionCountToAsk: null,
        questions: [],
      },
      {
        id: 4,
        category: "Analytical",
        questionCountToAsk: null,
        questions: [],
      },
      {
        id: 5,
        category: "Others",
        questionCountToAsk: null,
        questions: [],
      },
    ]);
    const [country, setCountry] = useState(career?.country || "Philippines");
    const [province, setProvince] = useState(career?.province ||"");
    const [city, setCity] = useState(career?.location || "");
    const [provinceList, setProvinceList] = useState([]);
    const [cityList, setCityList] = useState([]);
    const [showSaveModal, setShowSaveModal] = useState("");
    const [isSavingCareer, setIsSavingCareer] = useState(false);
    const savingCareerRef = useRef(false);

  // --- Segmented form state (Minimal additive change) ---
  // Steps now follow: Career Details & Team Access -> CV Review & Pre-Screening -> AI Interview Setup -> Pipeline Stages -> Review Career
  const steps = [
    "Career Details & Team Access",
    "CV Review & Pre-Screening",
    "AI Interview Setup",
    "Pipeline Stages",
    "Review Career",
  ];
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Team Access data (new). Default job owner is current user when adding a career.
  const [teamMembers, setTeamMembers] = useState<any[]>(() => {
    if (!career && user) {
      return [{ id: user?._id || "current-user", name: user?.name, email: user?.email, role: "Job Owner" }];
    }
    return career?.teamMembers || [];
  });

  // Save/restore local draft so user can resume at last step
  const DRAFT_KEY = "jia-career-draft";
  const autoSaveTimer = useRef<any>(null);
  const [isRestoredDraft, setIsRestoredDraft] = useState(false);

  // Pre-screening (new)
  const [cvSecretPrompt, setCvSecretPrompt] = useState<string>(career?.cvSecretPrompt || "");
  const [preScreeningQuestions, setPreScreeningQuestions] = useState<any[]>(career?.preScreeningQuestions || []);

  // AI Interview Setup (new)
  const [aiSecretPrompt, setAiSecretPrompt] = useState<string>(career?.aiSecretPrompt || "");

  // Pipeline stages (new)
  const [pipelineStages, setPipelineStages] = useState<any[]>(career?.pipelineStages || defaultPipeline);

  const isFormValid = () => {
    // Step-specific lightweight validation to minimize disruption
    if (currentStep === 0) {
      // Require core career basics including work setup (now back on step 0 per design)
      return jobTitle?.trim().length > 0 && description?.trim().length > 0 && workSetup?.trim().length > 0;
    }
    if (currentStep === 1) {
      // Step 1 (Pre-screening) currently has no mandatory fields
      return true;
    }
    if (currentStep === 2) {
      // Require at least one interview question generated
      return (questions || []).some((q) => (q.questions || []).length > 0);
    }
    return true;
  }

  // Save draft into localStorage (manual trigger via button)
  const saveDraftLocally = (notify: boolean = true) => {
    try {
      const draft = {
        jobTitle,
        description,
        workSetup,
        workSetupRemarks,
        screeningSetting,
        employmentType,
        requireVideo,
        salaryNegotiable,
        minimumSalary,
        maximumSalary,
        questions,
        country,
        province,
        city,
        teamMembers,
        currentStep,
        savedAt: Date.now(),
        // Newly added fields for extended segmented flow
        cvSecretPrompt,
        preScreeningQuestions,
        aiSecretPrompt,
        pipelineStages,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      if (notify) {
        candidateActionToast(
          <span style={{ fontSize: 14, fontWeight: 600 }}>Progress saved</span>,
          1200,
          <i className="la la-save" style={{ fontSize: 28, color: "#039855" }}></i>
        );
      }
    } catch (err) {
      console.error("Failed to save draft", err);
    }
  };

  // Auto-save draft on changes (debounced)
  useEffect(() => {
    if (formType !== "add") return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveDraftLocally(false), 800);
    return () => clearTimeout(autoSaveTimer.current);
  }, [jobTitle, description, workSetup, workSetupRemarks, screeningSetting, employmentType, requireVideo, salaryNegotiable, minimumSalary, maximumSalary, questions, country, province, city, teamMembers, cvSecretPrompt, preScreeningQuestions, aiSecretPrompt, pipelineStages, currentStep, formType]);

  // Restore draft on mount for Add flow
  useEffect(() => {
    if (formType !== "add") return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      setJobTitle(draft.jobTitle || "");
      setDescription(draft.description || "");
      setWorkSetup(draft.workSetup || "");
      setWorkSetupRemarks(draft.workSetupRemarks || "");
      setScreeningSetting(draft.screeningSetting || screeningSetting);
      setEmploymentType(draft.employmentType || employmentType);
      setRequireVideo(draft.requireVideo ?? requireVideo);
      setSalaryNegotiable(draft.salaryNegotiable ?? salaryNegotiable);
      setMinimumSalary(draft.minimumSalary || "");
      setMaximumSalary(draft.maximumSalary || "");
      setQuestions(draft.questions || questions);
      setCountry(draft.country || country);
      setProvince(draft.province || province);
      setCity(draft.city || city);
  setTeamMembers(draft.teamMembers || teamMembers);
  setCvSecretPrompt(draft.cvSecretPrompt || "");
  setPreScreeningQuestions(draft.preScreeningQuestions || []);
  setAiSecretPrompt(draft.aiSecretPrompt || "");
  setPipelineStages(draft.pipelineStages || defaultPipeline);
      setCurrentStep(typeof draft.currentStep === "number" ? draft.currentStep : 0);
      setIsRestoredDraft(true);
    } catch (e) {
      console.error("Failed to restore draft", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    const updateCareer = async (status: string) => {
        if (Number(minimumSalary) && Number(maximumSalary) && Number(minimumSalary) > Number(maximumSalary)) {
            errorToast("Minimum salary cannot be greater than maximum salary", 1300);
            return;
        }
        let userInfoSlice = {
            image: user.image,
            name: user.name,
            email: user.email,
        };
        const updatedCareer = {
            _id: career._id,
            jobTitle,
            description,
            workSetup,
            workSetupRemarks,
            questions,
            lastEditedBy: userInfoSlice,
            status,
            updatedAt: Date.now(),
            screeningSetting,
            requireVideo,
            salaryNegotiable,
            minimumSalary: isNaN(Number(minimumSalary)) ? null : Number(minimumSalary),
            maximumSalary: isNaN(Number(maximumSalary)) ? null : Number(maximumSalary),
            country,
            province,
            // Backwards compatibility
            location: city,
            employmentType,
      teamMembers, // new field
      cvSecretPrompt,
      preScreeningQuestions,
      aiSecretPrompt,
      pipelineStages,
        }
        try {
            setIsSavingCareer(true);
            const response = await axios.post("/api/update-career", updatedCareer);
            if (response.status === 200) {
                candidateActionToast(
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#181D27" }}>Career updated</span>
                    </div>,
                    1300,
                <i className="la la-check-circle" style={{ color: "#039855", fontSize: 32 }}></i>)
                setTimeout(() => {
                    window.location.href = `/recruiter-dashboard/careers/manage/${career._id}`;
                }, 1300);
            }
        } catch (error) {
            console.error(error);
            errorToast("Failed to update career", 1300);
        } finally {
            setIsSavingCareer(false);
        }
    }

  
    const confirmSaveCareer = (status: string) => {
        if (Number(minimumSalary) && Number(maximumSalary) && Number(minimumSalary) > Number(maximumSalary)) {
        errorToast("Minimum salary cannot be greater than maximum salary", 1300);
        return;
        }

        setShowSaveModal(status);
    }

    const saveCareer = async (status: string) => {
        setShowSaveModal("");
        if (!status) {
          return;
        }

        if (!savingCareerRef.current) {
        setIsSavingCareer(true);
        savingCareerRef.current = true;
        let userInfoSlice = {
            image: user.image,
            name: user.name,
            email: user.email,
        };
        const career = {
            jobTitle,
            description,
            workSetup,
            workSetupRemarks,
            questions,
            lastEditedBy: userInfoSlice,
            createdBy: userInfoSlice,
            screeningSetting,
            orgID,
            requireVideo,
            salaryNegotiable,
            minimumSalary: isNaN(Number(minimumSalary)) ? null : Number(minimumSalary),
            maximumSalary: isNaN(Number(maximumSalary)) ? null : Number(maximumSalary),
            country,
            province,
            // Backwards compatibility
            location: city,
            status,
            employmentType,
      teamMembers, // new field
      cvSecretPrompt,
      preScreeningQuestions,
      aiSecretPrompt,
      pipelineStages,
        }

        try {
            
            const response = await axios.post("/api/add-career", career);
            if (response.status === 200) {
            candidateActionToast(
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#181D27" }}>Career added {status === "active" ? "and published" : ""}</span>
                </div>,
                1300, 
            <i className="la la-check-circle" style={{ color: "#039855", fontSize: 32 }}></i>)
            setTimeout(() => {
                window.location.href = `/recruiter-dashboard/careers`;
            }, 1300);
            }
        } catch (error) {
            errorToast("Failed to add career", 1300);
        } finally {
            savingCareerRef.current = false;
            setIsSavingCareer(false);
        }
      }
    }

    useEffect(() => {
        const parseProvinces = () => {
          setProvinceList(philippineCitiesAndProvinces.provinces);
          const defaultProvince = philippineCitiesAndProvinces.provinces[0];
          if (!career?.province) {
            setProvince(defaultProvince.name);
          }
          const cities = philippineCitiesAndProvinces.cities.filter((city) => city.province === defaultProvince.key);
          setCityList(cities);
          if (!career?.location) {
            setCity(cities[0].name);
          }
        }
        parseProvinces();
      },[career])

    return (
        <div className="col">
        {formType === "add" ? (<div style={{ marginBottom: "24px", display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
              <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <h1 style={{ fontSize: "24px", fontWeight: 550, color: "#111827" }}>{jobTitle?.trim().length ? `[Draft] ${jobTitle}` : 'Add new career'}</h1>
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
                  <button
                    style={{ width: "fit-content", color: "#414651", background: "#fff", border: "1px solid #D5D7DA", padding: "8px 16px", borderRadius: "60px", cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => saveDraftLocally()}>
                      Save Progress
                  </button>
                  {currentStep === steps.length - 1 && (
                  <>
                  <button
                  disabled={!isFormValid() || isSavingCareer}
                   style={{ width: "fit-content", color: "#414651", background: "#fff", border: "1px solid #D5D7DA", padding: "8px 16px", borderRadius: "60px", cursor: !isFormValid() || isSavingCareer ? "not-allowed" : "pointer", whiteSpace: "nowrap" }} onClick={() => {
                    confirmSaveCareer("inactive");
                      }}>
                          Save as Unpublished
                  </button>
                  <button 
                  disabled={!isFormValid() || isSavingCareer}
                  style={{ width: "fit-content", background: !isFormValid() || isSavingCareer ? "#D5D7DA" : "black", color: "#fff", border: "1px solid #E9EAEB", padding: "8px 16px", borderRadius: "60px", cursor: !isFormValid() || isSavingCareer ? "not-allowed" : "pointer", whiteSpace: "nowrap"}} onClick={() => {
                    confirmSaveCareer("active");
                  }}>
                    <i className="la la-check-circle" style={{ color: "#fff", fontSize: 20, marginRight: 8 }}></i>
                      Save as Published
                  </button>
                  </>
                  )}
                </div>
              </div>
              {/* Step indicator (gradient style, like the reference image) */}
              <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 24, overflowX: "auto", paddingBottom: 6 }}>
                {steps.map((s, i) => {
                  const isDone = i < currentStep;
                  const isActive = i === currentStep;
                  const canNavigate = i <= currentStep; // allow going back or to current
                  const circleCommon: any = {
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  };
                  const barCommon: any = {
                    width: 180,
                    height: 6,
                    borderRadius: 8,
                    marginLeft: 12,
                    marginRight: 12,
                    flexShrink: 0,
                  };
                  return (
                    <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                      <div
                        onClick={() => { if (canNavigate) setCurrentStep(i); }}
                        style={{ display: "flex", alignItems: "center", cursor: canNavigate ? "pointer" : "default", opacity: canNavigate ? 1 : 0.45 }}
                      >
                        {/* Indicator circle */}
                        <div
                          style={{
                            ...circleCommon,
                            background: isDone ? "#0F172A" : isActive ? "#FFFFFF" : "transparent",
                            border: isDone ? "1px solid #0F172A" : isActive ? "2px solid #0F172A" : "2px solid #D5D7DA",
                          }}
                        >
                          {isDone ? (
                            <i className="la la-check" style={{ color: "#FFFFFF", fontSize: 12 }} />
                          ) : isActive ? (
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0F172A" }} />
                          ) : (
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D5D7DA" }} />
                          )}
                        </div>
                        {/* Connector bar (skip after last step) */}
                        {i < steps.length - 1 && (
                          <div
                            style={{
                              ...barCommon,
                              background: isDone
                                ? "linear-gradient(90deg, #9BC6FF 0%, #F1A1B8 100%)"
                                : "#E9EAEB",
                            }}
                          />
                        )}
                      </div>
                      {/* Label */}
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#181D27", marginTop: 6, whiteSpace: "nowrap" }}>{s}</span>
                    </div>
                  );
                })}
                {isRestoredDraft && <span style={{ fontSize: 12, color: "#039855", fontWeight: 600, alignSelf: "center" }}>Draft restored</span>}
              </div>
        </div>) : (
            <div style={{ marginBottom: "35px", display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 550, color: "#111827" }}>Edit Career Details</h1>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
                <button
                 style={{ width: "fit-content", color: "#414651", background: "#fff", border: "1px solid #D5D7DA", padding: "8px 16px", borderRadius: "60px", cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => {
                  setShowEditModal?.(false);
                    }}>
                        Cancel
                </button>
                <button
                  disabled={!isFormValid() || isSavingCareer}
                   style={{ width: "fit-content", color: "#414651", background: "#fff", border: "1px solid #D5D7DA", padding: "8px 16px", borderRadius: "60px", cursor: !isFormValid() || isSavingCareer ? "not-allowed" : "pointer", whiteSpace: "nowrap" }} onClick={() => {
                    updateCareer("inactive");
                    }}>
                          Save Changes as Unpublished
                  </button>
                  <button 
                  disabled={!isFormValid() || isSavingCareer}
                  style={{ width: "fit-content", background: !isFormValid() || isSavingCareer ? "#D5D7DA" : "black", color: "#fff", border: "1px solid #E9EAEB", padding: "8px 16px", borderRadius: "60px", cursor: !isFormValid() || isSavingCareer ? "not-allowed" : "pointer", whiteSpace: "nowrap"}} onClick={() => {
                    updateCareer("active");
                  }}>
                    <i className="la la-check-circle" style={{ color: "#fff", fontSize: 20, marginRight: 8 }}></i>
                      Save Changes as Published
                  </button>
              </div>
       </div>
        )}
  {currentStep === 0 && (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 24, marginTop: 16, width: "100%" }}>
      {/* Main Column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* 1. Career Information */}
        <div className="layered-card-outer">
          <div className="layered-card-middle">
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, backgroundColor: "#181D27", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="la la-suitcase" style={{ color: "#FFFFFF", fontSize: 20 }}></i>
              </div>
              <span style={{ fontSize: 16, color: "#181D27", fontWeight: 700 }}>1. Career Information</span>
            </div>
            <div className="layered-card-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Basic Information */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#414651" }}>Basic Information</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#414651" }}>Job Title</span>
                <input
                  value={jobTitle}
                  className="form-control"
                  placeholder="Enter job title"
                  onChange={(e) => {
                    setJobTitle(e.target.value || "");
                  }}
                />
              </div>
              {/* Work Setting */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#414651" }}>Work Setting</span>
                <div style={{ display: "flex", flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#414651" }}>Employment Type</span>
                    <CustomDropdown
                      onSelectSetting={(employmentType) => { setEmploymentType(employmentType); }}
                      screeningSetting={employmentType}
                      settingList={employmentTypeOptions}
                      placeholder="Choose employment type"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#414651" }}>Arrangement</span>
                    <CustomDropdown
                      onSelectSetting={(setting) => { setWorkSetup(setting); }}
                      screeningSetting={workSetup}
                      settingList={workSetupOptions}
                      placeholder="Choose work arrangement"
                    />
                  </div>
                </div>
              </div>
              {/* Location */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#414651" }}>Location</span>
                <div style={{ display: "flex", flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#414651" }}>Country</span>
                    <CustomDropdown onSelectSetting={(setting) => { setCountry(setting); }} screeningSetting={country} settingList={[]} placeholder="Philippines" />
                  </div>
                  <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#414651" }}>State / Province</span>
                    <CustomDropdown onSelectSetting={(province) => {
                      setProvince(province);
                      const provinceObj: any = provinceList.find((p: any) => p.name === province);
                      const cities = philippineCitiesAndProvinces.cities.filter((city: any) => city.province === provinceObj?.key);
                      setCityList(cities);
                      if (cities?.length) setCity(cities[0].name);
                    }} screeningSetting={province} settingList={provinceList} placeholder="Choose state / province" />
                  </div>
                  <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#414651" }}>City</span>
                    <CustomDropdown onSelectSetting={(city) => { setCity(city); }} screeningSetting={city} settingList={cityList} placeholder="Choose city" />
                  </div>
                </div>
              </div>
              {/* Salary */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#414651" }}>Salary</span>
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "#414651" }}>Negotiable</span>
                    <label className="switch" style={{ margin: 0 }}>
                      <input type="checkbox" checked={salaryNegotiable} onChange={() => setSalaryNegotiable(!salaryNegotiable)} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#414651" }}>Minimum Salary</span>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#6c757d" }}>P</span>
                      <input type="number" className="form-control" style={{ paddingLeft: 26 }} placeholder="0" min={0} value={minimumSalary} onChange={(e) => { setMinimumSalary(e.target.value || ""); }} />
                      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#6c757d" }}>PHP</span>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#414651" }}>Maximum Salary</span>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#6c757d" }}>P</span>
                      <input type="number" className="form-control" style={{ paddingLeft: 26 }} placeholder="0" min={0} value={maximumSalary} onChange={(e) => { setMaximumSalary(e.target.value || ""); }} />
                      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#6c757d" }}>PHP</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* 2. Job Description */}
        <div className="layered-card-outer">
          <div className="layered-card-middle">
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, backgroundColor: "#181D27", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="la la-file-alt" style={{ color: "#FFFFFF", fontSize: 20 }}></i>
              </div>
              <span style={{ fontSize: 16, color: "#181D27", fontWeight: 700 }}>2. Job Description</span>
            </div>
            <div className="layered-card-content" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <RichTextEditor setText={setDescription} text={description} />
            </div>
          </div>
        </div>
        {/* 3. Team Access */}
        <div className="layered-card-outer">
          <div className="layered-card-middle">
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, backgroundColor: "#181D27", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="la la-users" style={{ color: "#FFFFFF", fontSize: 20 }}></i>
              </div>
              <span style={{ fontSize: 16, color: "#181D27", fontWeight: 700 }}>3. Team Access</span>
            </div>
            <div style={{ marginTop: 4 }}>
              <TeamAccessSection teamMembers={teamMembers} setTeamMembers={setTeamMembers} user={user} orgID={orgID} />
            </div>
          </div>
        </div>
      </div>
      {/* Tips Sidebar */}
      <div style={{ width: 300, maxWidth: 320, flexShrink: 0, position: "sticky", top: 90 }}>
        <div className="layered-card-outer">
          <div className="layered-card-middle">
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#F4EBFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="la la-lightbulb" style={{ color: "#7F56D9", fontSize: 16 }}></i>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#181D27" }}>Tips</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 12, lineHeight: 1.4, color: "#414651" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontWeight: 600 }}>Use clear, standard job titles</span>
                <span>Better searchability (e.g., “Software Engineer” instead of “Code Ninja” or “Tech Rockstar”).</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontWeight: 600 }}>Avoid abbreviations</span>
                <span>Use “QA Engineer” instead of internal codes like “QE” or “QA TL”.</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontWeight: 600 }}>Keep it concise</span>
                <span>2–4 words max; avoid fluff or marketing terms.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}
        {/* End step 0 */}

        {currentStep === 1 && (
          <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 24, marginTop: 8, width: "100%" }}>
            {/* Left column */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* 1. CV Review Settings */}
              <div className="layered-card-outer">
                <div className="layered-card-middle">
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, backgroundColor: "#181D27", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className="la la-clipboard-check" style={{ color: "#FFFFFF", fontSize: 20 }}></i>
                    </div>
                    <span style={{ fontSize: 16, color: "#181D27", fontWeight: 700 }}>1. CV Review Settings</span>
                  </div>
                  <div className="layered-card-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* CV Screening */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#181D27", marginBottom: 6 }}>CV Screening</div>
                      <div style={{ color: "#667085", fontSize: 12, marginBottom: 8 }}>Jia automatically endorses candidates who meet the chosen criteria.</div>
                      <CustomDropdown
                        onSelectSetting={(setting) => { setScreeningSetting(setting); }}
                        screeningSetting={screeningSetting}
                        settingList={screeningSettingList}
                      />
                    </div>
                    {/* Divider */}
                    <div style={{ height: 1, background: "#F0F2F5", margin: "8px 0" }} />
                    {/* CV Secret Prompt */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <i className="la la-user-secret" style={{ color: "#E63B7A" }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#181D27" }}>CV Secret Prompt (optional)</span>
                        <i className="la la-question-circle" title="Secret Prompts help fine-tune Jia's CV evaluation" style={{ color: "#98A2B3", fontSize: 14 }} />
                      </div>
                      <div style={{ color: "#667085", fontSize: 12, marginBottom: 8 }}>
                        Secret Prompts give you extra control over Jia’s evaluation style, complementing her assessment of requirements from the job description.
                      </div>
                      <textarea
                        className="form-control"
                        placeholder="e.g., Prioritize candidates with strong hands-on Java experience and OOP; look for Spring Boot/Hibernate..."
                        value={cvSecretPrompt}
                        onChange={(e) => setCvSecretPrompt(e.target.value)}
                        rows={5}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Pre-Screening Questions (optional) */}
              <PreScreeningSection
                questions={preScreeningQuestions}
                setQuestions={setPreScreeningQuestions}
                cvSecretPrompt={cvSecretPrompt}
                setCvSecretPrompt={setCvSecretPrompt}
                hideSecretPrompt={true}
              />
            </div>
            {/* Right column - Tips */}
            <div style={{ width: 300, maxWidth: 320, flexShrink: 0, position: "sticky", top: 90 }}>
              <div className="layered-card-outer">
                <div className="layered-card-middle">
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#F4EBFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className="la la-lightbulb" style={{ color: "#7F56D9", fontSize: 16 }}></i>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#181D27" }}>Tips</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 12, lineHeight: 1.4, color: "#414651" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontWeight: 600 }}>Add a Secret Prompt</span>
                      <span>Fine-tune how Jia scores and evaluates submitted CVs.</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontWeight: 600 }}>Add Pre-Screening questions</span>
                      <span>Collect key details such as notice period, work setup, or salary expectations to guide your review and candidate discussions.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {currentStep === 2 && (
          <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 24, marginTop: 8, width: "100%" }}>
            {/* Left column */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* 1. AI Interview Settings */}
              <div className="layered-card-outer">
                <div className="layered-card-middle">
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, backgroundColor: "#181D27", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className="la la-robot" style={{ color: "#FFFFFF", fontSize: 20 }}></i>
                    </div>
                    <span style={{ fontSize: 16, color: "#181D27", fontWeight: 700 }}>1. AI Interview Settings</span>
                  </div>
                  <div className="layered-card-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <AIInterviewSetupSection screeningSetting={screeningSetting} setScreeningSetting={setScreeningSetting} requireVideo={requireVideo} setRequireVideo={setRequireVideo} aiSecretPrompt={aiSecretPrompt} setAiSecretPrompt={setAiSecretPrompt} />
                  </div>
                </div>
              </div>
              {/* AI Interview Questions (child provides its own card wrapper + header with actions) */}
              <InterviewQuestionGeneratorV2 questions={questions} setQuestions={(qs) => setQuestions(qs)} jobTitle={jobTitle} description={description} />
            </div>
            {/* Tips Sidebar */}
            <div style={{ width: 300, maxWidth: 320, flexShrink: 0, position: "sticky", top: 90 }}>
              <div className="layered-card-outer">
                <div className="layered-card-middle">
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#F4EBFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className="la la-lightbulb" style={{ color: "#7F56D9", fontSize: 16 }}></i>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#181D27" }}>Tips</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 12, lineHeight: 1.4, color: "#414651" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontWeight: 600 }}>Add a Secret Prompt</span>
                      <span>Fine-tune how Jia scores and evaluates the interview responses.</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontWeight: 600 }}>Use "Generate Questions"</span>
                      <span>Quickly create tailored interview questions, then refine or mix them with your own for balanced results.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {currentStep === 3 && (
          <PipelineStagesSection stages={pipelineStages} setStages={setPipelineStages} />
        )}
        {currentStep === 4 && (
          <ReviewCareerSection
            data={{ jobTitle, description, workSetup, workSetupRemarks, screeningSetting, employmentType, requireVideo, salaryNegotiable, minimumSalary, maximumSalary, country, province, city, teamMembers, cvSecretPrompt, preScreeningQuestions, aiSecretPrompt, pipelineStages, questions }}
            onEditSection={(id) => {
              const map: Record<string, number> = { career: 0, cv: 1, ai: 2, pipeline: 3 };
              if (typeof map[id] === 'number') setCurrentStep(map[id]);
            }}
          />
        )}

        {/* Navigation */}
        {formType === "add" && (
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", marginTop: 24 }}>
            <button disabled={currentStep === 0} onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} style={{ background: currentStep === 0 ? "#E9EAEB" : "#FFFFFF", color: "#181D27", border: "1px solid #D5D7DA", padding: "10px 20px", borderRadius: 60, cursor: currentStep === 0 ? "not-allowed" : "pointer" }}>Previous</button>
            {currentStep < steps.length - 1 ? (
              <button disabled={!isFormValid()} onClick={() => setCurrentStep((s) => Math.min(steps.length - 1, s + 1))} style={{ background: !isFormValid() ? "#D5D7DA" : "#181D27", color: "#FFFFFF", border: "1px solid #181D27", padding: "10px 24px", borderRadius: 60, cursor: !isFormValid() ? "not-allowed" : "pointer" }}>Save & Continue</button>
            ) : (
              <div />
            )}
          </div>
        )}
      {showSaveModal && (
         <CareerActionModal action={showSaveModal} onAction={(action) => saveCareer(action)} />
        )}
    {isSavingCareer && (
        <FullScreenLoadingAnimation title={formType === "add" ? "Saving career..." : "Updating career..."} subtext={`Please wait while we are ${formType === "add" ? "saving" : "updating"} the career`} />
    )}
    </div>
    )
}