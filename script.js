// =========
// Theme Handling (Dark / Light)
// =========

(function () {
    const root = document.documentElement;
    const storedTheme = localStorage.getItem("site-theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      root.setAttribute("data-theme", storedTheme);
    } else {
      root.setAttribute("data-theme", "light");
    }
  })();
  
  document.addEventListener("DOMContentLoaded", () => {
    const root = document.documentElement;
  
    // Theme toggle
    const themeToggle = document.querySelector(".theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        const currentTheme = root.getAttribute("data-theme") || "light";
        const nextTheme = currentTheme === "light" ? "dark" : "light";
        root.setAttribute("data-theme", nextTheme);
        localStorage.setItem("site-theme", nextTheme);
      });
    }
  
    // ====== Mobile Nav ======
    const navToggle = document.querySelector(".nav-toggle");
    const navLinks = document.querySelector(".nav-links");
    if (navToggle && navLinks) {
      navToggle.addEventListener("click", () => {
        navLinks.classList.toggle("open");
      });
  
      navLinks.addEventListener("click", (e) => {
        if (e.target.tagName === "A") {
          navLinks.classList.remove("open");
        }
      });
    }
  
    // ====== Footer Year ======
    const yearSpan = document.getElementById("year");
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }
  
    // ====== Scroll Reveal ======
    const revealElements = document.querySelectorAll("[data-reveal]");
    if (IntersectionObserver && revealElements.length) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("reveal-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.1,
        }
      );
  
      revealElements.forEach((el) => observer.observe(el));
    } else {
      // Fallback: make all visible
      revealElements.forEach((el) => el.classList.add("reveal-visible"));
    }
  
    // ====== Home Page: Image to PDF Converter ======
    const imageInput = document.getElementById("image-input");
    const uploadArea = document.getElementById("upload-area");
    const previewGrid = document.getElementById("preview-grid");
    const convertBtn = document.getElementById("convert-btn");
    const downloadBtn = document.getElementById("download-btn");
    const clearBtn = document.getElementById("clear-images");
    const loadingIndicator = document.getElementById("loading-indicator");
  
    let selectedFiles = [];
    let generatedPdfBlobUrl = null;
  
    function resetDownloadUrl() {
      if (generatedPdfBlobUrl) {
        URL.revokeObjectURL(generatedPdfBlobUrl);
        generatedPdfBlobUrl = null;
      }
    }
  
    function updateButtons() {
      const hasFiles = selectedFiles.length > 0;
      if (convertBtn) convertBtn.disabled = !hasFiles;
      if (downloadBtn) downloadBtn.disabled = !generatedPdfBlobUrl;
    }
  
    function renderPreviews() {
      if (!previewGrid) return;
      previewGrid.innerHTML = "";
      selectedFiles.forEach((file, index) => {
        const url = URL.createObjectURL(file);
        const item = document.createElement("div");
        item.className = "preview-item";
  
        const img = document.createElement("img");
        img.src = url;
        img.alt = `Selected image ${index + 1}`;
        img.onload = () => URL.revokeObjectURL(url);
  
        const indexBadge = document.createElement("span");
        indexBadge.className = "preview-index";
        indexBadge.textContent = index + 1;
  
        item.appendChild(img);
        item.appendChild(indexBadge);
        previewGrid.appendChild(item);
      });
    }
  
    function handleFiles(files) {
      if (!files || !files.length) return;
      const images = Array.from(files).filter((file) =>
        file.type.startsWith("image/")
      );
      if (!images.length) return;
  
      selectedFiles = selectedFiles.concat(images);
      resetDownloadUrl();
      renderPreviews();
      updateButtons();
    }
  
    if (uploadArea && imageInput) {
      uploadArea.addEventListener("click", () => {
        imageInput.click();
      });
  
      imageInput.addEventListener("change", (e) => {
        const files = e.target.files;
        handleFiles(files);
        imageInput.value = "";
      });
  
      ["dragover", "dragenter"].forEach((eventName) => {
        uploadArea.addEventListener(
          eventName,
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add("dragover");
          },
          false
        );
      });
  
      ["dragleave", "dragend", "drop"].forEach((eventName) => {
        uploadArea.addEventListener(
          eventName,
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (eventName !== "drop") {
              uploadArea.classList.remove("dragover");
            }
          },
          false
        );
      });
  
      uploadArea.addEventListener("drop", (e) => {
        uploadArea.classList.remove("dragover");
        const dt = e.dataTransfer;
        if (dt && dt.files) {
          handleFiles(dt.files);
        }
      });
    }
  
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        selectedFiles = [];
        resetDownloadUrl();
        if (previewGrid) previewGrid.innerHTML = "";
        updateButtons();
      });
    }
  
    if (convertBtn && downloadBtn && loadingIndicator) {
      convertBtn.addEventListener("click", async () => {
        if (!selectedFiles.length) return;
  
        // jsPDF is loaded through UMD as window.jspdf
        if (!window.jspdf || !window.jspdf.jsPDF) {
          alert("PDF library failed to load. Please check your connection and try again.");
          return;
        }
  
        convertBtn.disabled = true;
        downloadBtn.disabled = true;
        loadingIndicator.classList.add("active");
        loadingIndicator.setAttribute("aria-hidden", "false");
        resetDownloadUrl();
  
        try {
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  
          for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
  
            // Read the image as Data URL
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
  
            const img = await new Promise((resolve, reject) => {
              const image = new Image();
              image.onload = () => resolve(image);
              image.onerror = reject;
              image.src = dataUrl;
            });
  
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgAspect = img.width / img.height;
            const pageAspect = pageWidth / pageHeight;
  
            let renderWidth, renderHeight;
            if (imgAspect > pageAspect) {
              // Image is wider than page
              renderWidth = pageWidth * 0.9;
              renderHeight = renderWidth / imgAspect;
            } else {
              // Image is taller than page
              renderHeight = pageHeight * 0.9;
              renderWidth = renderHeight * imgAspect;
            }
  
            const x = (pageWidth - renderWidth) / 2;
            const y = (pageHeight - renderHeight) / 2;
  
            if (i > 0) {
              pdf.addPage();
            }
            pdf.addImage(
              dataUrl,
              file.type === "image/png" ? "PNG" : "JPEG",
              x,
              y,
              renderWidth,
              renderHeight
            );
          }
  
          const blob = pdf.output("blob");
          generatedPdfBlobUrl = URL.createObjectURL(blob);
          downloadBtn.disabled = false;
        } catch (error) {
          console.error(error);
          alert("An error occurred while converting images to PDF. Please try again.");
        } finally {
          loadingIndicator.classList.remove("active");
          loadingIndicator.setAttribute("aria-hidden", "true");
          convertBtn.disabled = !selectedFiles.length;
        }
      });
  
      downloadBtn.addEventListener("click", () => {
        if (!generatedPdfBlobUrl) return;
        const a = document.createElement("a");
        a.href = generatedPdfBlobUrl;
        a.download = "images-to-pdf.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
    }
  
    // Initial button state
    updateButtons();
  
    // ====== Contact Form Validation (frontend only) ======
    const contactForm = document.getElementById("contact-form");
    if (contactForm) {
      const successMessage = document.getElementById("contact-success");
  
      contactForm.addEventListener("submit", (e) => {
        e.preventDefault();
  
        if (successMessage) {
          successMessage.textContent = "";
        }
  
        const fields = ["name", "email", "subject", "message"];
        let isValid = true;
  
        fields.forEach((fieldName) => {
          const field = contactForm.querySelector(`#${fieldName}`);
          const errorSpan = contactForm.querySelector(`[data-error-for="${fieldName}"]`);
          if (!field || !errorSpan) return;
  
          errorSpan.textContent = "";
          const value = field.value.trim();
  
          if (!value) {
            errorSpan.textContent = "This field is required.";
            isValid = false;
            return;
          }
  
          if (fieldName === "email") {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(value)) {
              errorSpan.textContent = "Please enter a valid email address.";
              isValid = false;
            }
          }
  
          if (fieldName === "message" && value.length < 10) {
            errorSpan.textContent = "Please provide at least 10 characters.";
            isValid = false;
          }
        });
  
        if (!isValid) return;
  
        contactForm.reset();
        if (successMessage) {
          successMessage.textContent =
            "Thank you for contacting us. Your message has been received (demo only).";
        }
      });
    }
  });