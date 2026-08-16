--[[
	RebirthMenu LocalScript

	Wires the Rebirth menu UI to your existing systems:
	- Fires ReplicatedStorage.RebirthEvent when "Rebirth" is clicked
	  (matches your existing server script: rebirthEvent.OnServerEvent
	  takes no extra args, just the player).
	- Reads leaderstats.Rebirths and leaderstats["??"] live to update
	  the displayed numbers whenever they change.
	- Opens the menu when a "Rebirth" button elsewhere in your game
	  is clicked (see OpenTrigger note below), and closes on the X button.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local LocalPlayer = Players.LocalPlayer
local rebirthEvent = ReplicatedStorage:WaitForChild("RebirthEvent")

local ScreenGui = script.Parent :: ScreenGui
local MainFrame = ScreenGui:WaitForChild("MainFrame")
local Header = MainFrame:WaitForChild("Header")
local CloseButton = Header:WaitForChild("CloseButton") :: TextButton
local Body = MainFrame:WaitForChild("Body")

local CompareRow = Body:WaitForChild("CompareRow")
local BeforeValue = CompareRow:WaitForChild("Before"):WaitForChild("Value") :: TextLabel
local AfterValue = CompareRow:WaitForChild("After"):WaitForChild("Value") :: TextLabel

local LevelBarBackground = Body:WaitForChild("LevelBarBackground")
local LevelFill = LevelBarBackground:WaitForChild("Fill") :: Frame
local LevelText = LevelBarBackground:WaitForChild("LevelText") :: TextLabel

local ButtonRow = Body:WaitForChild("ButtonRow")
local RebirthButton = ButtonRow:WaitForChild("RebirthButton") :: TextButton
local SkipRebirthButton = ButtonRow:WaitForChild("SkipRebirthButton") :: TextButton

local BASE_COST = 10 -- keep in sync with the server's BASE_COST

-- ============================================================
-- OPEN / CLOSE
-- ============================================================

local isOpen = false

local function refreshDisplay()
	local leaderstats = LocalPlayer:FindFirstChild("leaderstats")
	if not leaderstats then
		return
	end
	local rebirths = leaderstats:FindFirstChild("Rebirths")
	if not rebirths then
		return
	end

	local currentRebirths = rebirths.Value
	BeforeValue.Text = tostring(currentRebirths)
	AfterValue.Text = tostring(currentRebirths + 1)

	-- NOTE: "Level" here refers to whatever in-game progression bar you use
	-- (e.g. blocks placed this rebirth). Replace this placeholder with your
	-- actual level-tracking value/leaderstat once you have one.
	local level = leaderstats:FindFirstChild("Level")
	local maxLevel = 10 + (currentRebirths * 15) -- matches "Max Level 10 -> 25" style scaling; adjust to your real formula
	if level then
		local progress = math.clamp(level.Value / maxLevel, 0, 1)
		LevelFill.Size = UDim2.new(progress, 0, 1, 0)
		LevelText.Text = ("Level %d/%d"):format(level.Value, maxLevel)
	end
end

local function playOpenAnimation()
	MainFrame.Visible = true
	MainFrame.Size = UDim2.new(0, 520, 0, 0)
	local target = UDim2.new(0, 520, 0, 380)
	TweenService:Create(MainFrame, TweenInfo.new(0.25, Enum.EasingStyle.Quint, Enum.EasingDirection.Out), {
		Size = target,
	}):Play()
end

local function playCloseAnimation()
	local tween = TweenService:Create(MainFrame, TweenInfo.new(0.2, Enum.EasingStyle.Quint, Enum.EasingDirection.In), {
		Size = UDim2.new(0, 520, 0, 0),
	})
	tween.Completed:Connect(function()
		MainFrame.Visible = false
	end)
	tween:Play()
end

local function openMenu()
	if isOpen then
		return
	end
	isOpen = true
	refreshDisplay()
	playOpenAnimation()
end

local function closeMenu()
	if not isOpen then
		return
	end
	isOpen = false
	playCloseAnimation()
end

CloseButton.MouseButton1Click:Connect(closeMenu)

local OpenRebirthButton = ScreenGui:WaitForChild("OpenRebirthButton") :: TextButton
OpenRebirthButton.MouseButton1Click:Connect(openMenu)

-- ============================================================
-- REBIRTH BUTTON
-- ============================================================

RebirthButton.MouseButton1Click:Connect(function()
	rebirthEvent:FireServer()
end)

SkipRebirthButton.MouseButton1Click:Connect(function()
	-- Hook this up to your own "skip rebirth, keep levels" RemoteEvent
	-- once that system exists server-side. Left as a stub for now.
end)

-- ============================================================
-- LIVE UPDATES
-- ============================================================

local leaderstats = LocalPlayer:WaitForChild("leaderstats")
leaderstats:WaitForChild("Rebirths").Changed:Connect(refreshDisplay)

local levelStat = leaderstats:FindFirstChild("Level")
if levelStat then
	levelStat.Changed:Connect(refreshDisplay)
end

-- ============================================================
-- EXTERNAL OPEN TRIGGER
-- Expose a global function so any other button in your game (e.g. a
-- "Rebirth" button hovering above the map) can open this menu:
--     game.Players.LocalPlayer.PlayerGui.RebirthMenu.LocalScript.Open:Invoke()
-- or simpler, just require this via a BindableEvent if you prefer.
-- For now: expose via an attribute-triggered BindableFunction.
-- ============================================================

local openBindable = Instance.new("BindableFunction")
openBindable.Name = "OpenRebirthMenu"
openBindable.OnInvoke = function()
	openMenu()
	return true
end
openBindable.Parent = ScreenGui

MainFrame.Visible = false
