import {
    FormInputError,
    Input,
} from "../../../components/Index.jsx";

const GlobalCounts = ({ counts, onGlobalCountChange, errors }) => {
    return (
        <div>
            <div className="superadmin_onboard_edit_form_grid">
                <div className="superadmin_onboard_edit_form_group">
                    <label className="form_label" htmlFor="userCount">Users Count</label>
                    <Input
                        id="userCount"
                        name="MEMBER"
                        type="number"
                        min={0}
                        placeholder="Enter Users count"
                        value={counts.MEMBER ?? 0}
                        onChange={onGlobalCountChange}
                    />
                    {errors.userCount && <FormInputError message={errors.userCount} />}
                </div>
                <div className="superadmin_onboard_edit_form_group">
                    <label className="form_label" htmlFor="phoneNumberCount">Phone Number Count</label>
                    <Input
                        id="phoneNumberCount"
                        name="PHONENUMBER"
                        type="number"
                        min={0}
                        placeholder="Enter Phone number count"
                        value={counts.PHONENUMBER ?? 0}
                        onChange={onGlobalCountChange}
                    />
                    {errors.phoneNumberCount && <FormInputError message={errors.phoneNumberCount} />}
                </div>
                <div className="superadmin_onboard_edit_form_group">
                    <label className="form_label" htmlFor="callLimitCount">Call Limit Count</label>
                    <Input
                        id="callLimitCount"
                        name="CALLLIMIT"
                        type="number"
                        min={0}
                        placeholder="Enter Call Limit count"
                        value={counts.CALLLIMIT ?? 0}
                        onChange={onGlobalCountChange}
                    />
                    {errors.callLimitCount && <FormInputError message={errors.callLimitCount} />}
                </div>
            </div>

            <div className="superadmin_onboard_edit_form_grid">
                <div className="superadmin_onboard_edit_form_group">
                    <label className="form_label" htmlFor="queueCount">Queue Count</label>
                    <Input
                        id="queueCount"
                        name="QUEUE"
                        type="number"
                        min={0}
                        placeholder="Enter Queue count"
                        value={counts.QUEUE ?? 0}
                        onChange={onGlobalCountChange}
                    />
                    {errors.queueCount && <FormInputError message={errors.queueCount} />}
                </div>
                <div className="superadmin_onboard_edit_form_group">
                    <label className="form_label" htmlFor="holidayCount">Holiday Count</label>
                    <Input
                        id="holidayCount"
                        name="HOLIDAY"
                        type="number"
                        min={0}
                        placeholder="Enter Holiday count"
                        value={counts.HOLIDAY ?? 0}
                        onChange={onGlobalCountChange}
                    />
                    {errors.holidayCount && <FormInputError message={errors.holidayCount} />}
                </div>
                <div className="superadmin_onboard_edit_form_group">
                    <label className="form_label" htmlFor="callflowCount">Callflow Count</label>
                    <Input
                        id="callflowCount"
                        name="CALLFLOW"
                        type="number"
                        min={0}
                        placeholder="Enter Callflow count"
                        value={counts.CALLFLOW ?? 0}
                        onChange={onGlobalCountChange}
                    />
                    {errors.callflowCount && <FormInputError message={errors.callflowCount} />}
                </div>
            </div>

            <div className="superadmin_onboard_edit_form_grid">
                <div className="superadmin_onboard_edit_form_group">
                    <label className="form_label" htmlFor="campaignCount">Campaign Count</label>
                    <Input
                        id="campaignCount"
                        name="CAMPAIGN"
                        type="number"
                        min={0}
                        placeholder="Enter Campaign count"
                        value={counts.CAMPAIGN ?? 0}
                        onChange={onGlobalCountChange}
                    />
                    {errors.campaignCount && <FormInputError message={errors.campaignCount} />}
                </div>
                <div className="superadmin_onboard_edit_form_group">
                    <label className="form_label" htmlFor="formbuilderCount">Formbuilder Count</label>
                    <Input
                        id="formbuilderCount"
                        name="FORMBUILDER"
                        type="number"
                        min={0}
                        placeholder="Enter Formbuilder count"
                        value={counts.FORMBUILDER ?? 0}
                        onChange={onGlobalCountChange}
                    />
                    {errors.formbuilderCount && <FormInputError message={errors.formbuilderCount} />}
                </div>
                <div className="superadmin_onboard_edit_form_group">
                    <label className="form_label" htmlFor="membergroupCount">Membergroup Count</label>
                    <Input
                        id="membergroupCount"
                        name="MEMBERGROUP"
                        type="number"
                        min={0}
                        placeholder="Enter Membergroup count"
                        value={counts.MEMBERGROUP ?? 0}
                        onChange={onGlobalCountChange}
                    />
                    {errors.membergroupCount && <FormInputError message={errors.membergroupCount} />}
                </div>
            </div>

            <div className="superadmin_onboard_edit_form_grid">
                <div className="superadmin_onboard_edit_form_group">
                    <label className="form_label" htmlFor="phonenumbergroupCount">Phone Number group Count</label>
                    <Input
                        id="phonenumbergroupCount"
                        name="PHONENUMBERGROUP"
                        type="number"
                        min={0}
                        placeholder="Enter Phone Number group count"
                        value={counts.PHONENUMBERGROUP ?? 0}
                        onChange={onGlobalCountChange}
                    />
                    {errors.phonenumbergroupCount && <FormInputError message={errors.phonenumbergroupCount} />}
                </div>
            </div>
        </div>
    );
}

export default GlobalCounts;
