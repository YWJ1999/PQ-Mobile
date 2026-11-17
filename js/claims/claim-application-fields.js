// The request pages and their read-only approval views share these application cards.
const ClaimApplicationFields = (() => {
  const templates = {
    'Medical Claim': `
      <div class="form-card">
        <div class="section-header-bar no-top-border">
          <span class="section-title-accent"></span>
          <span class="section-title-text">APPLICATION DETAILS</span>
        </div>
        <div class="field-group">
          <label class="field-label">Benefit Year</label>
          <input type="text" id="medicalBenefitYearInput" data-claim-field="benefitYear" class="form-ctrl" value="2026" readonly />
        </div>
        <div class="field-group">
          <label class="field-label">Benefit Type</label>
          <input type="text" id="genBenefitTypeInput" data-claim-field="benefitType" class="form-ctrl" value="MEDICAL CLAIMS" readonly />
        </div>
        <div class="field-group" style="display: flex; flex-direction: column; gap: 10px; margin-top: 4px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span class="field-label" style="margin-bottom: 0;">Entitled Balance</span>
            <span id="entitledPillDisplay" data-claim-field="entitledBalance" class="dark-balance-pill">RM 800.00</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span class="field-label" style="margin-bottom: 0;">Usable Balance</span>
            <span id="usablePillDisplay" data-claim-field="usableBalance" class="dark-balance-pill">RM 640.10</span>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Claim Period <span class="req">*</span></label>
          <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 10px;">
            <div class="select-wrapper">
              <select id="mClaimYear" data-claim-field="periodYear" class="form-ctrl">
                <option value="2026" selected>2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
            <div class="select-wrapper">
              <select id="mClaimMonth" data-claim-field="periodMonth" class="form-ctrl">
                <option value="September" selected>September</option>
                <option value="August">August</option>
                <option value="July">July</option>
              </select>
            </div>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Receipt Date <span class="req">*</span></label>
          <input type="date" id="mReceiptDate" data-claim-field="receiptDate" class="form-ctrl" value="2026-09-23" />
        </div>
        <div class="field-group">
          <label class="field-label">Receipt No.</label>
          <input type="text" id="mReceiptNoInput" data-claim-field="receiptNo" class="form-ctrl" value="REC-88310" placeholder="Enter receipt number" />
        </div>
        <div class="field-group">
          <label class="field-label">Claim Total (RM)</label>
          <input type="text" id="mClaimTotalInput" data-claim-field="claimTotal" class="form-ctrl" value="0.00" readonly />
        </div>
        <div class="field-group">
          <label class="field-label">Remark</label>
          <input type="text" id="mRemarkInput" data-claim-field="remarks" class="form-ctrl" placeholder="Enter remark..." />
        </div>
        <label class="field-label form-section-heading" style="font-size: 13.5px; font-weight: 800; color: var(--text-primary); margin-bottom: 12px; display: block;">Upload Attachment</label>
        <div style="display: flex; align-items: center; justify-content: center; gap: 36px; padding: 8px 0;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;" onclick="triggerFileUpload('main')">
            <div style="width: 54px; height: 54px; border-radius: 50%; background: rgba(124, 58, 237, 0.12); border: 1px solid rgba(124, 58, 237, 0.3); display: flex; align-items: center; justify-content: center; color: var(--purple-primary); font-size: 18px;">
              <i class="fa-solid fa-file-arrow-up"></i>
            </div>
            <span style="font-size: 12.5px; font-weight: 700; color: var(--purple-primary);">Select File(s)</span>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;" onclick="triggerFileUpload('main')">
            <div style="width: 54px; height: 54px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 18px; box-shadow: 0 6px 18px rgba(124, 58, 237, 0.45);">
              <i class="fa-solid fa-camera"></i>
            </div>
            <span style="font-size: 12.5px; font-weight: 800; color: var(--text-primary);">Take Picture</span>
          </div>
        </div>
        <div id="mainChipsList" class="attachment-upload-list"></div>
      </div>`,
    'OT Claim': `
      <div class="form-card">
        <div class="section-header-bar no-top-border">
          <span class="section-title-accent"></span>
          <span class="section-title-text">APPLICATION DETAILS</span>
        </div>
        <div class="field-group">
          <label class="field-label">Claim Period <span class="req">*</span></label>
          <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 10px;">
            <div class="select-wrapper">
              <select id="v1ClaimYear" data-claim-field="periodYear" class="form-ctrl">
                <option value="2026" selected>2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
            <div class="select-wrapper">
              <select id="v1ClaimMonth" data-claim-field="periodMonth" class="form-ctrl">
                <option value="September" selected>September</option>
                <option value="August">August</option>
                <option value="July">July</option>
                <option value="June">June</option>
              </select>
            </div>
          </div>
        </div>
      </div>`,
    'Travel Claim': `
      <div class="form-card">
        <div class="section-header-bar no-top-border">
          <span class="section-title-accent"></span>
          <span class="section-title-text">APPLICATION DETAILS</span>
        </div>
        <div class="field-group">
          <label class="field-label">Claim Period</label>
          <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 10px;">
            <div class="select-wrapper">
              <select id="v1ClaimPeriodYear" data-claim-field="periodYear" class="form-ctrl">
                <option value="2026" selected>2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
            <div class="select-wrapper">
              <select id="v1ClaimPeriodMonth" data-claim-field="periodMonth" class="form-ctrl">
                <option value="September" selected>September</option>
                <option value="August">August</option>
                <option value="July">July</option>
              </select>
            </div>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Travelling Request #</label>
          <div class="select-wrapper">
            <select id="v1TravellingReqNo" data-claim-field="travelRequestNo" class="form-ctrl">
              <option value="" selected>- Select Travelling Request # -</option>
              <option value="TR-2026-001">TR-2026-001 (KL Site Visit)</option>
              <option value="TR-2026-002">TR-2026-002 (Penang Client Meeting)</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Benefit Type</label>
          <div class="select-wrapper">
            <select id="v1TravelClaimType" data-claim-field="benefitType" class="form-ctrl">
              <option value="" selected>Select Benefit</option>
              <option value="MILEAGE">MILEAGE (RM0.80/KM)</option>
              <option value="TRAVEL RECORD">TRAVEL RECORD</option>
              <option value="PARKING & TOLLS">PARKING &amp; TOLL RECEIPTS</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Claim Date</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <input type="date" id="v1ClaimStartDate" data-claim-field="claimDateFrom" class="form-ctrl" value="2026-09-23" aria-label="Claim Date From" />
            <input type="date" id="v1ClaimEndDate" data-claim-field="claimDateTo" class="form-ctrl" value="2026-09-23" aria-label="Claim Date To" />
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Cost Centre</label>
          <div class="select-wrapper">
            <select id="v1CostCentre" data-claim-field="costCentre" class="form-ctrl">
              <option value="MANAGEMENT" selected>MANAGEMENT</option>
              <option value="ADMINISTRATION">ADMINISTRATION</option>
              <option value="OPERATIONS">OPERATIONS</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Charge To</label>
          <div class="select-wrapper">
            <select id="v1ChargeTo" data-claim-field="chargeTo" class="form-ctrl">
              <option value="" selected>- Select Charge -</option>
              <option value="Company HQ">Company HQ</option>
              <option value="Project Budget">Project Budget</option>
              <option value="Client Account">Client Account</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Purpose</label>
          <input type="text" id="v1Purpose" data-claim-field="purpose" class="form-ctrl" placeholder="" />
        </div>
        <div class="field-group">
          <label class="field-label">Project</label>
          <div class="select-wrapper">
            <select id="v1Project" data-claim-field="project" class="form-ctrl">
              <option value="" selected>- Select Project -</option>
              <option value="PROJ-01">HQ Digitalization</option>
              <option value="PROJ-02">Enterprise Migration</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Claim Currency</label>
          <div class="select-wrapper">
            <select id="v1ClaimCurrency" data-claim-field="currency" class="form-ctrl">
              <option value="MYR" selected>RINGGIT MALAYSIA</option>
              <option value="USD">US DOLLAR</option>
              <option value="SGD">SINGAPORE DOLLAR</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 0;">
            <span class="field-label" style="margin-bottom: 0;">Claim Total</span>
            <span id="travelClaimTotalDisplay" data-claim-field="claimTotal" style="font-size: 15px; font-weight: 800; color: var(--text-primary);">0.00</span>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Remarks</label>
          <input type="text" id="v1Remarks" data-claim-field="remarks" class="form-ctrl" placeholder="" />
        </div>
        <div class="field-group">
          <label class="field-label form-section-heading">Upload Attachment</label>
          <div style="display: flex; align-items: center; justify-content: center; gap: 36px; padding: 8px 0;">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;" onclick="triggerFileUpload('main')">
              <div style="width: 54px; height: 54px; border-radius: 50%; background: rgba(124, 58, 237, 0.12); border: 1px solid rgba(124, 58, 237, 0.3); display: flex; align-items: center; justify-content: center; color: var(--purple-primary); font-size: 18px;"><i class="fa-solid fa-file-arrow-up"></i></div>
              <span style="font-size: 12.5px; font-weight: 700; color: var(--purple-primary);">Select File(s)</span>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;" onclick="triggerFileUpload('main')">
              <div style="width: 54px; height: 54px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 18px; box-shadow: 0 6px 18px rgba(124, 58, 237, 0.45);"><i class="fa-solid fa-camera"></i></div>
              <span style="font-size: 12.5px; font-weight: 800; color: var(--text-primary);">Take Picture</span>
            </div>
          </div>
          <div id="mainChipsList" class="attachment-upload-list"></div>
        </div>
      </div>`,
    'Travel Request': `
      <div class="form-card">
        <div class="section-header-bar no-top-border">
          <span class="section-title-accent"></span>
          <span class="section-title-text">APPLICATION DETAILS</span>
        </div>
        <div class="field-group">
          <label class="field-label">Traveling Period</label>
          <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 10px;">
            <div class="select-wrapper">
              <select id="v1PeriodYear" data-claim-field="periodYear" class="form-ctrl">
                <option value="2026" selected>2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
            <div class="select-wrapper">
              <select id="v1PeriodMonth" data-claim-field="periodMonth" class="form-ctrl">
                <option value="September" selected>September</option>
                <option value="August">August</option>
                <option value="July">July</option>
              </select>
            </div>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Travel Date</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <input type="date" id="v1StartDate" data-claim-field="travelDateFrom" class="form-ctrl" value="2026-09-24" aria-label="Travel date from" />
            <input type="date" id="v1EndDate" data-claim-field="travelDateTo" class="form-ctrl" value="2026-09-24" aria-label="Travel date to" />
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Training Reference</label>
          <div class="select-wrapper">
            <select id="v1TrainingRef" data-claim-field="trainingReference" class="form-ctrl">
              <option value="" selected>- Select Training Ref -</option>
              <option value="TR-2026-001">TR-2026-001 (User Training)</option>
              <option value="TR-2026-002">TR-2026-002 (System Integration)</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Benefit Type</label>
          <div class="select-wrapper">
            <select id="v1BenefitType" data-claim-field="benefitType" class="form-ctrl">
              <option value="" selected>Select Benefit</option>
              <option value="TRAVEL ALLOWANCE">TRAVEL ALLOWANCE</option>
              <option value="OUTSTATION BENEFIT">OUTSTATION BENEFIT</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Travel Type</label>
          <div class="select-wrapper">
            <select id="v1TravelType" data-claim-field="travelType" class="form-ctrl">
              <option value="" selected>- Select Travel Type -</option>
              <option value="DOMESTIC">DOMESTIC</option>
              <option value="OVERSEAS">OVERSEAS</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Purpose</label>
          <input type="text" id="v1Purpose" data-claim-field="purpose" class="form-ctrl" placeholder="" />
        </div>
        <div class="field-group">
          <label class="field-label">Destination</label>
          <input type="text" id="v1Destination" data-claim-field="destination" class="form-ctrl" placeholder="" />
        </div>
        <div class="field-group">
          <label class="field-label">Reason</label>
          <div class="select-wrapper">
            <select id="v1Reason" data-claim-field="reason" class="form-ctrl">
              <option value="" selected>- Select Reason -</option>
              <option value="CLIENT MEETING">CLIENT MEETING</option>
              <option value="USER TRAINING">USER TRAINING</option>
              <option value="SITE INSPECTION">SITE INSPECTION</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Car Type</label>
          <input type="text" id="v1CarType" data-claim-field="carType" class="form-ctrl" value="Personal" />
        </div>
        <div class="field-group">
          <label class="field-label">Passenger(s)</label>
          <div class="select-wrapper">
            <select id="v1Passengers" class="form-ctrl" onchange="handlePassengerAdd(this)">
              <option value="" selected>- Select Passenger -</option>
              <option value="Sarah Jenkins">Sarah Jenkins (#EBB01)</option>
              <option value="Marcus Tan">Marcus Tan (#004177)</option>
              <option value="Daniel Lee">Daniel Lee (#000582)</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Selected Passenger(s)</label>
          <div id="v1SelectedPassengersContainer" data-claim-field="passengers" style="display: flex; flex-wrap: wrap; gap: 6px; min-height: 28px;">
            <span style="font-size: 12px; color: var(--text-muted); font-style: italic;">None selected</span>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Charge To</label>
          <div class="select-wrapper">
            <select id="v1ChargeTo" data-claim-field="chargeTo" class="form-ctrl">
              <option value="" selected>- Select Charge -</option>
              <option value="Company HQ">Company HQ</option>
              <option value="Project Budget">Project Budget</option>
              <option value="Client Account">Client Account</option>
            </select>
          </div>
        </div>
        <div class="field-group toggle-option-card">
          <label class="toggle-option-label">Accommodation</label>
          <div class="radio-circle-opt leave-toggle" id="v1Accomodation" data-claim-field="accommodation" onclick="toggleRadioCircle('v1Accomodation')" role="switch" aria-checked="false"></div>
        </div>
        <div class="field-group toggle-option-card">
          <label class="toggle-option-label">Flight</label>
          <div class="radio-circle-opt leave-toggle" id="v1Flight" data-claim-field="flight" onclick="toggleRadioCircle('v1Flight')" role="switch" aria-checked="false"></div>
        </div>
        <div class="field-group">
          <label class="field-label">Remarks</label>
          <input type="text" id="v1Remarks" data-claim-field="remarks" class="form-ctrl" placeholder="" />
        </div>
        <label class="field-label form-section-heading" style="font-size: 13.5px; font-weight: 800; color: var(--text-primary); margin-bottom: 12px; display: block;">Upload Attachment</label>
        <div style="display: flex; align-items: center; justify-content: center; gap: 36px; padding: 8px 0;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;" onclick="triggerFileUpload('main')">
            <div style="width: 54px; height: 54px; border-radius: 50%; background: rgba(124, 58, 237, 0.12); border: 1px solid rgba(124, 58, 237, 0.3); display: flex; align-items: center; justify-content: center; color: var(--purple-primary); font-size: 18px;">
              <i class="fa-solid fa-file-arrow-up"></i>
            </div>
            <span style="font-size: 12.5px; font-weight: 700; color: var(--purple-primary);">Select File(s)</span>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;" onclick="triggerFileUpload('main')">
            <div style="width: 54px; height: 54px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 18px; box-shadow: 0 6px 18px rgba(124, 58, 237, 0.45);">
              <i class="fa-solid fa-camera"></i>
            </div>
            <span style="font-size: 12.5px; font-weight: 800; color: var(--text-primary);">Take Picture</span>
          </div>
        </div>
        <div id="mainChipsList" class="attachment-upload-list"></div>
      </div>`,
    'Entertainment Claim': `
      <div class="form-card">
        <div class="section-header-bar no-top-border">
          <span class="section-title-accent"></span>
          <span class="section-title-text">GENERAL DETAILS</span>
        </div>
        <div class="field-group">
          <label class="field-label">Claim Period</label>
          <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 10px;">
            <div class="select-wrapper">
              <select id="v1ClaimPeriodYear" data-claim-field="periodYear" class="form-ctrl">
                <option value="2026" selected>2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
            <div class="select-wrapper">
              <select id="v1ClaimPeriodMonth" data-claim-field="periodMonth" class="form-ctrl">
                <option value="September" selected>September</option>
                <option value="August">August</option>
                <option value="July">July</option>
              </select>
            </div>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Travelling &amp; Mileage Claim #</label>
          <div class="select-wrapper">
            <select id="travelClaimNoSelect" data-claim-field="travellingMileageClaimNo" class="form-ctrl">
              <option value="" selected>- Select -</option>
              <option value="TRV-2026-001">TRV-2026-001 (Penang Client Visit)</option>
              <option value="TRV-2026-002">TRV-2026-002 (JB Business Trip)</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Benefit Type</label>
          <div class="select-wrapper">
            <select id="benefitTypeSelect" data-claim-field="benefitType" class="form-ctrl">
              <option value="" selected>Select Benefit</option>
              <option value="CLIENT ENTERTAINMENT">CLIENT ENTERTAINMENT</option>
              <option value="BUSINESS DINING & MEAL">BUSINESS DINING &amp; MEAL</option>
              <option value="CORPORATE GIFT">CORPORATE GIFT</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Claim Date</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <input type="date" id="claimStartDate" data-claim-field="claimDateFrom" class="form-ctrl" value="2026-09-24" aria-label="Claim date from" />
            <input type="date" id="claimEndDate" data-claim-field="claimDateTo" class="form-ctrl" value="2026-09-24" aria-label="Claim date to" />
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Cost Centre</label>
          <div class="select-wrapper">
            <select id="costCentreInput" data-claim-field="costCentre" class="form-ctrl">
              <option value="MANAGEMENT" selected>MANAGEMENT</option>
              <option value="ADMINISTRATION">ADMINISTRATION</option>
              <option value="OPERATIONS">OPERATIONS</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Project</label>
          <div class="select-wrapper">
            <select id="projectSelect" data-claim-field="project" class="form-ctrl">
              <option value="" selected>- Select Project -</option>
              <option value="PROJ-01">Project Alpha</option>
              <option value="PROJ-02">Enterprise Migration</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Entertained Person/Org</label>
          <input type="text" id="entertainedPersonInput" data-claim-field="entertainedPersonOrg" class="form-ctrl" placeholder="" />
        </div>
        <div class="field-group">
          <label class="field-label">Place Entertained</label>
          <input type="text" id="placeEntertainedInput" data-claim-field="placeEntertained" class="form-ctrl" placeholder="" />
        </div>
        <div class="field-group">
          <label class="field-label">Purpose</label>
          <input type="text" id="purposeInput" data-claim-field="purpose" class="form-ctrl" placeholder="" />
        </div>
        <div class="field-group">
          <label class="field-label">Currency</label>
          <div class="select-wrapper">
            <select id="currencyInput" data-claim-field="currency" class="form-ctrl">
              <option value="RINGGIT MALAYSIA" selected>RINGGIT MALAYSIA</option>
              <option value="US DOLLAR">US DOLLAR</option>
              <option value="SINGAPORE DOLLAR">SINGAPORE DOLLAR</option>
            </select>
          </div>
        </div>
        <div class="entertainment-summary">
          <div class="entertainment-summary-row">
            <span class="entertainment-summary-label">Total Amount</span>
            <span id="summaryTotalAmount" data-claim-field="claimTotal" class="entertainment-summary-value">0.00</span>
          </div>
          <div class="entertainment-summary-row">
            <span class="entertainment-summary-label">No of Internal Attendees</span>
            <span id="summaryInternalPax" data-claim-field="internalAttendeeCount" class="entertainment-summary-value">0</span>
          </div>
          <div class="entertainment-summary-row">
            <span class="entertainment-summary-label">No of External Attendees</span>
            <span id="summaryExternalPax" data-claim-field="externalAttendeeCount" class="entertainment-summary-value">0</span>
          </div>
          <div class="entertainment-summary-row">
            <span class="entertainment-summary-label">Avg Per Pax</span>
            <span id="summaryAvgPax" data-claim-field="avgPerPax" class="entertainment-summary-value">0.00</span>
          </div>
        </div>
        <div class="field-group toggle-option-card">
          <label class="toggle-option-label">Board Approve</label>
          <label class="custom-toggle"><input type="checkbox" id="boardApproveCheck" data-claim-field="boardApprove" /><span class="slider"></span></label>
        </div>
        <div style="margin-top: 10px; margin-bottom: 12px;">
          <div style="font-size: 12.5px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">Declaration For</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div class="toggle-option-card">
              <label class="toggle-option-label">Gift/Ent</label>
              <label class="custom-toggle"><input type="checkbox" id="giftEntCheck" data-claim-field="giftEnt" /><span class="slider"></span></label>
            </div>
            <div class="toggle-option-card">
              <label class="toggle-option-label">Trv/Hosp</label>
              <label class="custom-toggle"><input type="checkbox" id="trvHospCheck" data-claim-field="trvHosp" /><span class="slider"></span></label>
            </div>
          </div>
        </div>
        <div class="field-group" style="margin-bottom: 0;">
          <label class="field-label">Remarks</label>
          <input type="text" id="v1Remarks" data-claim-field="remarks" class="form-ctrl" placeholder="" />
        </div>
        <div style="margin-top: 18px;">
          <label class="field-label form-section-heading" style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 10px;">Upload Attachment</label>
          <div style="display: flex; align-items: center; justify-content: center; gap: 36px; padding: 8px 0;">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;" onclick="triggerFileUpload('main')">
              <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(124, 58, 237, 0.12); border: 1px solid rgba(124, 58, 237, 0.3); display: flex; align-items: center; justify-content: center; color: var(--purple-primary); font-size: 18px;">
                <i class="fa-solid fa-file-arrow-up"></i>
              </div>
              <span style="font-size: 12px; font-weight: 700; color: var(--purple-primary);">Select File(s)</span>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;" onclick="triggerFileUpload('main')">
              <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 18px; box-shadow: 0 6px 18px rgba(124, 58, 237, 0.45);">
                <i class="fa-solid fa-camera"></i>
              </div>
              <span style="font-size: 12px; font-weight: 800; color: var(--text-primary);">Take Picture</span>
            </div>
          </div>
          <div id="mainChipsList" class="attachment-upload-list"></div>
        </div>
      </div>`,
    'Advance Claim': `
      <div class="form-card">
        <div class="section-header-bar no-top-border">
          <span class="section-title-accent"></span>
          <span class="section-title-text">APPLICATION DETAILS</span>
        </div>
        <div class="field-group">
          <label class="field-label">Claim Period</label>
          <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 10px;">
            <div class="select-wrapper">
              <select id="claimPeriodYear" data-claim-field="periodYear" class="form-ctrl">
                <option value="2026" selected>2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
            <div class="select-wrapper">
              <select id="claimPeriodMonth" data-claim-field="periodMonth" class="form-ctrl">
                <option value="September" selected>September</option>
                <option value="August">August</option>
                <option value="July">July</option>
              </select>
            </div>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Claim Date <span class="req">*</span></label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <input type="date" id="claimStartDate" data-claim-field="claimDateFrom" class="form-ctrl" value="2026-09-23" aria-label="Claim date from" />
            <input type="date" id="claimEndDate" data-claim-field="claimDateTo" class="form-ctrl" value="2026-09-23" aria-label="Claim date to" />
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Cost Centre <span class="req">*</span></label>
          <div class="select-wrapper">
            <select id="costCentreSelect" data-claim-field="costCentre" class="form-ctrl">
              <option value="MANAGEMENT" selected>MANAGEMENT</option>
              <option value="OPERATIONS">OPERATIONS</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Project</label>
          <div class="select-wrapper">
            <select id="projectSelect" data-claim-field="project" class="form-ctrl">
              <option value="">- Select Project -</option>
              <option value="PROJ-01">Project Alpha</option>
              <option value="PROJ-02">Enterprise Migration</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Claim Type <span class="req">*</span></label>
          <div class="select-wrapper">
            <select id="claimTypeSelect" data-claim-field="claimType" class="form-ctrl">
              <option value="OVERSEAS TRAVEL ADVANCE" selected>OVERSEAS TRAVEL ADVANCE</option>
              <option value="PROJECT OOP ADVANCE">PROJECT OOP ADVANCE</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Benefit Type <span class="req">*</span></label>
          <div class="select-wrapper">
            <select id="benefitTypeSelect" data-claim-field="benefitType" class="form-ctrl">
              <option value="ADVANCE" selected>ADVANCE</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Purpose</label>
          <input type="text" id="purposeInput" data-claim-field="purpose" class="form-ctrl" value="" placeholder="Enter purpose..." />
        </div>
        <div class="field-group">
          <label class="field-label">Claim Currency</label>
          <div class="select-wrapper">
            <select id="claimCurrencySelect" data-claim-field="currency" class="form-ctrl">
              <option value="MYR" selected>RINGGIT MALAYSIA</option>
              <option value="USD">US DOLLAR</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 0;">
            <span class="field-label" style="margin-bottom: 0;">Claim Total</span>
            <span id="advanceClaimTotalDisplay" data-claim-field="claimTotal" style="font-size: 15px; font-weight: 800; color: var(--text-primary);">0.00</span>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Remarks</label>
          <input type="text" id="remarksInput" data-claim-field="remarks" class="form-ctrl" placeholder="Enter remarks..." />
        </div>
      </div>`,
    'Expense Claim': `
      <div class="form-card">
        <div class="section-header-bar no-top-border">
          <span class="section-title-accent"></span>
          <span class="section-title-text">APPLICATION DETAILS</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 10px;" class="field-group">
          <div>
            <label class="field-label">Claim Period</label>
            <input type="text" id="claimPeriodYear" data-claim-field="periodYear" class="form-ctrl" value="2026" readonly />
          </div>
          <div style="padding-top: 22px;">
            <div class="select-wrapper">
              <select id="claimPeriodMonth" data-claim-field="periodMonth" class="form-ctrl" aria-label="Claim Period Month">
                <option value="September" selected>September</option>
                <option value="October">October</option>
                <option value="November">November</option>
              </select>
            </div>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Claim Date</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <input type="date" id="claimDateFrom" data-claim-field="claimDateFrom" class="form-ctrl" value="2026-09-25" aria-label="Claim date from" />
            <input type="date" id="claimDateTo" data-claim-field="claimDateTo" class="form-ctrl" value="2026-09-25" aria-label="Claim date to" />
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 10px;" class="field-group">
          <div>
            <label class="field-label">Benefit Year</label>
            <input type="text" id="benefitYear" data-claim-field="benefitYear" class="form-ctrl" value="2026" readonly />
          </div>
          <div>
            <label class="field-label">Benefit Type</label>
            <div class="select-wrapper">
              <select id="benefitTypeSelect" data-claim-field="benefitType" class="form-ctrl">
                <option value="" selected>Select Benefit</option>
                <option value="GENERAL EXPENSE">General Expense</option>
                <option value="OFFICE SUPPLIES">Office Supplies</option>
                <option value="SUBSCRIPTIONS">Subscriptions & Software</option>
              </select>
            </div>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Purpose<span class="req">*</span></label>
          <input type="text" id="claimPurpose" data-claim-field="purpose" class="form-ctrl" value="" placeholder="Enter claim purpose..." />
        </div>
        <div class="field-group">
          <label class="field-label">Claim Currency</label>
          <div class="select-wrapper">
            <select id="claimCurrencySelect" data-claim-field="currency" class="form-ctrl">
              <option value="RINGGIT MALAYSIA" selected>RINGGIT MALAYSIA</option>
              <option value="US DOLLAR">US DOLLAR</option>
              <option value="SINGAPORE DOLLAR">SINGAPORE DOLLAR</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Claim Total</label>
        <input type="text" id="claimTotalInput" data-claim-field="claimTotal" class="form-ctrl" value="0.00" readonly style="color: var(--text-primary); font-weight: 800;" />
        </div>
        <div class="field-group">
          <label class="field-label">Project</label>
          <div class="select-wrapper">
            <select id="projectSelect" data-claim-field="project" class="form-ctrl">
              <option value="" selected>Select Project</option>
              <option value="HQ Digitalization">HQ Digitalization</option>
              <option value="Mobile HCM App">Mobile HCM App</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Cost Centre</label>
          <div class="select-wrapper">
            <select id="costCentreSelect" data-claim-field="costCentre" class="form-ctrl">
              <option value="MANAGEMENT" selected>MANAGEMENT</option>
              <option value="ADMINISTRATION">ADMINISTRATION</option>
              <option value="FINANCE & ACCOUNTING">FINANCE & ACCOUNTING</option>
            </select>
          </div>
        </div>
        <div class="field-group" style="margin-bottom: 0;">
          <label class="field-label">Remarks</label>
          <input type="text" id="claimRemarks" data-claim-field="remarks" class="form-ctrl" placeholder="Enter remarks..." />
        </div>
      </div>`
  };

  const months = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i, 1).toLocaleString('en-GB', { month: 'long' }));

  function create(type) {
    const template = document.createElement('template');
    template.innerHTML = templates[type];
    return template.content.firstElementChild;
  }

  function mount(type) {
    const card = create(type);
    document.getElementById('claimApplicationFields').replaceWith(card);
    window.addEventListener('pageshow', () => { delete card.dataset.submitted; });
  }

  function submit(type, details) {
    const form = document.querySelector('#view-1-main .form-card');
    if (form.dataset.submitted) return false;
    const fields = {};
    for (const field of form.querySelectorAll('[data-claim-field]')) {
      let value = field.value ?? field.textContent.trim();
      if (field.type === 'checkbox') value = field.checked;
      else if (field.matches('[role="switch"]')) value = field.getAttribute('aria-checked') === 'true';
      else if (field.matches('select')) value = field.value ? field.selectedOptions[0].textContent.trim() : '';
      fields[field.dataset.claimField] = value;
    }
    const month = months.indexOf(fields.periodMonth) + 1 || Number(fields.periodMonth);
    fields.period = month ? fields.periodYear + String(month).padStart(2, '0') : fields.periodYear;
    fields.attachments = Array.from(form.querySelectorAll('#mainChipsList .attachment-upload-name'), el => el.textContent);
    try {
      ClaimRequestStore.submit({ ...fields, ...details }, type);
      form.dataset.submitted = 'true';
      return true;
    } catch {
      showToast('Could not save your request. Please try again.');
      return false;
    }
  }

  function display(value) {
    if (value == null || value === '') return '—';
    if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return String(value);
  }

  function files(names) {
    const list = document.createElement('div');
    list.className = 'claim-review-files';
    for (const name of names) {
      const item = document.createElement('div');
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-paperclip';
      icon.setAttribute('aria-hidden', 'true');
      item.append(icon, document.createTextNode(name));
      list.append(item);
    }
    if (!list.childElementCount) list.textContent = 'No attachments';
    return list;
  }

  function review(record) {
    const card = create(record.optionName);
    const heading = document.createElement('h2');
    heading.className = 'form-section-heading';
    heading.textContent = card.querySelector('.section-title-text').textContent;
    card.querySelector('.section-header-bar').replaceWith(heading);
    const period = String(record.claimPeriodStart ?? record.period ?? '');
    const match = /^(\d{4})(?:-?(0[1-9]|1[0-2]))?$/.exec(period);
    const range = String(record.claimDate ?? '').split(/\s+[-–]\s+/);
    const values = { ...record,
      periodYear: record.periodYear ?? match?.[1] ?? period,
      periodMonth: record.periodMonth ?? (match?.[2] ? months[Number(match[2]) - 1] : ''),
      claimDateFrom: record.claimDateFrom ?? range[0], claimDateTo: record.claimDateTo ?? range[1] ?? range[0],
      claimTotal: record.claimTotal ?? record.totalAmount ?? record.amount,
      claimType: record.claimType ?? record.advanceType
    };
    card.querySelector('#v1Passengers')?.closest('.field-group').remove();
    for (const field of card.querySelectorAll('[data-claim-field]')) {
      const key = field.dataset.claimField;
      const target = field.type === 'checkbox' ? field.parentElement : field;
      const value = document.createElement('div');
      const compact = field.matches('.dark-balance-pill,.entertainment-summary-value,[role="switch"],input[type="checkbox"]');
      value.className = compact ? 'claim-review-compact' : 'form-ctrl claim-review-value';
      if (field.classList.contains('dark-balance-pill')) value.classList.add('dark-balance-pill');
      value.dataset.claimField = key;
      const raw = values[key];
      if (field.classList.contains('dark-balance-pill') && raw !== '' && raw != null && Number.isFinite(Number(raw))) {
        value.textContent = 'RM ' + Number(raw).toFixed(2);
      } else {
        value.textContent = key === 'claimTotal' && typeof raw === 'number' ? raw.toFixed(2) : display(raw);
      }
      target.replaceWith(value);
    }
    card.querySelectorAll('.req').forEach(el => el.remove());
    const originalAttachment = record.attachment || record.receipt;
    const names = record.attachments ?? (originalAttachment ? [originalAttachment] : []);
    const originalFiles = card.querySelector('#mainChipsList');
    if (originalFiles) {
      const uploadActions = originalFiles.previousElementSibling;
      const label = uploadActions.previousElementSibling;
      label.textContent = 'Attachments';
      uploadActions.remove();
      originalFiles.replaceWith(files(names));
    } else if (names.length) {
      const label = document.createElement('h2');
      label.className = 'form-section-heading';
      label.textContent = 'Attachments';
      card.append(label, files(names));
    }
    return card;
  }

  return { mount, submit, review, display, files };
})();
